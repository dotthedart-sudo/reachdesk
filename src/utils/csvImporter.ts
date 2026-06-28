import { supabase } from '../lib/supabase';
import { splitFullName, normalizePriority } from './csvMapping';

interface ImportBatchOptions {
  data: any[][];
  headers: string[];
  mapping: Record<number, string>;
  duplicateStrategy: 'skip' | 'overwrite';
  folderId: string | null;
  defaultPriority: string;
  userId: string;
  filename: string;
  onProgress: (imported: number, skipped: number, errors: number, progress: number) => void;
  onComplete: (imported: number, skipped: number, errors: number) => void;
}

export async function processImportBatch({
  data,
  headers,
  mapping,
  duplicateStrategy,
  folderId,
  defaultPriority,
  userId,
  filename,
  onProgress,
  onComplete
}: ImportBatchOptions) {
  let importedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  const totalRows = data.length;
  if (totalRows === 0) {
    onComplete(0, 0, 0);
    return;
  }

  // 1. Pre-fetch existing leads to handle duplicates efficiently
  const existingEmails = new Map<string, string>(); // email -> lead_id
  try {
    const { data: leadsData } = await supabase
      .from('leads')
      .select('id, email')
      .eq('user_id', userId);
      
    if (leadsData) {
      leadsData.forEach(lead => {
        if (lead.email) {
          existingEmails.set(lead.email.toLowerCase().trim(), lead.id);
        }
      });
    }
  } catch (err) {
    console.error('Error fetching existing leads for deduplication:', err);
    // Continue anyway; we'll catch DB constraint errors on insert
  }

  // 2. Process in batches
  const batchSize = 50;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    
    const insertData: any[] = [];
    const updateData: any[] = [];

    for (const row of batch) {
      const leadObj: any = {
        user_id: userId,
        folder_id: folderId || null,
        custom_fields: {},
        status: 'Lead',
        priority: defaultPriority,
        first_name: null,
        last_name: null,
        email: null
      };

      // Extract fields according to mapping
      headers.forEach((_, colIdx) => {
        const fieldKey = mapping[colIdx];
        const rawValue = row[colIdx]?.trim() || '';

        if (!fieldKey || fieldKey === 'skip') return;

        if (fieldKey === 'custom') {
          // Fallback to header name if unmapped column selected as custom field
          leadObj.custom_fields[headers[colIdx]] = rawValue !== '' ? rawValue : null;
        } else if (fieldKey === 'full_name') {
          const { first_name, last_name } = splitFullName(rawValue);
          leadObj.first_name = first_name !== '' ? first_name : leadObj.first_name;
          leadObj.last_name = last_name !== '' ? last_name : leadObj.last_name;
        } else if (fieldKey === 'priority') {
          leadObj.priority = normalizePriority(rawValue, defaultPriority);
        } else {
          leadObj[fieldKey] = rawValue !== '' ? rawValue : null;
        }
      });

      // Cleanup
      if (!leadObj.first_name) leadObj.first_name = null;
      if (!leadObj.email) leadObj.email = null;

      // Validation check
      if (!leadObj.first_name && !leadObj.email) {
        errorCount++;
        continue; // Skip this row
      }

      // Deduplication check
      const emailLower = leadObj.email ? leadObj.email.toLowerCase().trim() : '';
      const existingLeadId = emailLower ? existingEmails.get(emailLower) : null;

      if (existingLeadId) {
        if (duplicateStrategy === 'skip') {
          skippedCount++;
        } else if (duplicateStrategy === 'overwrite') {
          leadObj.id = existingLeadId;
          updateData.push(leadObj);
        }
      } else {
        insertData.push(leadObj);
      }
    }

    // 3. Perform DB operations for this batch
    try {
      if (insertData.length > 0) {
        const { error } = await supabase.from('leads').insert(insertData);
        if (error) {
          console.error('Batch insert error:', error.message);
          errorCount += insertData.length;
        } else {
          importedCount += insertData.length;
          // Update our local map so same-batch duplicates don't slip through
          insertData.forEach(l => {
            if (l.email) existingEmails.set(l.email.toLowerCase().trim(), 'new');
          });
        }
      }

      if (updateData.length > 0) {
        for (const upd of updateData) {
          const { error } = await supabase.from('leads').update(upd).eq('id', upd.id);
          if (error) {
            console.error('Lead update error:', error.message);
            errorCount++;
          } else {
            importedCount++;
          }
        }
      }
    } catch (err) {
      console.error('Error executing batch operations:', err);
      errorCount += batch.length;
    }

    // 4. Report progress
    const currentProgress = Math.min(100, Math.round(((i + batch.length) / totalRows) * 100));
    onProgress(importedCount, skippedCount, errorCount, currentProgress);
  }

  // 5. Log import history
  try {
    await supabase.from('csv_imports').insert({
      user_id: userId,
      filename: filename,
      total_rows: totalRows,
      imported: importedCount,
      skipped: skippedCount,
      errors: errorCount,
      field_mapping: mapping,
      duplicate_strategy: duplicateStrategy,
      status: 'completed'
    });
  } catch (err) {
    console.error('Failed to log import to csv_imports:', err);
  }

  onComplete(importedCount, skippedCount, errorCount);
}
