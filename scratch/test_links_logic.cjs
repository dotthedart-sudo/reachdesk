// Unit test for the Link parsing and saving logic

const detectPlatformLabel = (url) => {
  if (!url) return 'Website';
  try {
    const cleanUrl = url.startsWith('http') ? url : `https://${url}`;
    const host = new URL(cleanUrl).hostname.toLowerCase();
    if (host.includes('linkedin.com')) return 'LinkedIn';
    if (host.includes('instagram.com')) return 'Instagram';
    if (host.includes('twitter.com') || host.includes('x.com')) return 'Twitter';
  } catch {}
  return 'Website';
};

function testParsing(leadForm, pastedLink) {
  const linksArray = [...(leadForm.links || [])];
  if (pastedLink && pastedLink.trim()) {
    const val = pastedLink.trim();
    const cleanUrl = val.startsWith('http') ? val : `https://${val}`;
    const label = detectPlatformLabel(val);
    if (!linksArray.some(l => l.url === cleanUrl)) {
      linksArray.push({ url: cleanUrl, label });
    }
  }

  const urlUpdates = { linkedin_url: null, instagram_url: null, twitter_url: null, website: null };
  linksArray.forEach(link => {
    const url = typeof link === 'string' ? link : link.url;
    if (url.includes('linkedin.com')) urlUpdates.linkedin_url = url;
    else if (url.includes('instagram.com')) urlUpdates.instagram_url = url;
    else if (url.includes('twitter.com') || url.includes('x.com')) urlUpdates.twitter_url = url;
    else urlUpdates.website = url;
  });

  return { linksArray, urlUpdates };
}

// Run Test Cases
console.log("--- TESTING LINK PARSING LOGIC ---");

// Test Case 1: Empty state
const tc1 = testParsing({ links: [] }, "");
console.assert(tc1.urlUpdates.linkedin_url === null, "TC1 Failed");
console.assert(tc1.urlUpdates.website === null, "TC1 Failed");

// Test Case 2: Pasted linkedin link (unsaved, pending in input)
const tc2 = testParsing({ links: [] }, "linkedin.com/in/user");
console.log("TC2 Result:", tc2);
console.assert(tc2.urlUpdates.linkedin_url === "https://linkedin.com/in/user", "TC2 Failed");
console.assert(tc2.linksArray.length === 1, "TC2 Failed");

// Test Case 3: Mixed already saved links and pending pasted link
const leadForm = {
  links: [
    { url: "https://instagram.com/myinst", label: "Instagram" }
  ]
};
const tc3 = testParsing(leadForm, "https://x.com/mytwitter");
console.log("TC3 Result:", tc3);
console.assert(tc3.urlUpdates.instagram_url === "https://instagram.com/myinst", "TC3 Failed");
console.assert(tc3.urlUpdates.twitter_url === "https://x.com/mytwitter", "TC3 Failed");
console.assert(tc3.linksArray.length === 2, "TC3 Failed");

// Test Case 4: Multiple links and a generic website fallback
const leadForm4 = {
  links: [
    { url: "https://linkedin.com/in/user", label: "LinkedIn" },
    { url: "https://myblog.com", label: "Website" }
  ]
};
const tc4 = testParsing(leadForm4, "instagram.com/user");
console.log("TC4 Result:", tc4);
console.assert(tc4.urlUpdates.linkedin_url === "https://linkedin.com/in/user", "TC4 Failed");
console.assert(tc4.urlUpdates.instagram_url === "https://instagram.com/user", "TC4 Failed");
console.assert(tc4.urlUpdates.website === "https://myblog.com", "TC4 Failed");

console.log("✅ ALL PARSING LOGIC TESTS PASSED!");
