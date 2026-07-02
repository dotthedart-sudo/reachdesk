console.log('Environment keys:');
Object.keys(process.env).forEach(key => {
  if (key.toLowerCase().includes('pass') || key.toLowerCase().includes('db') || key.toLowerCase().includes('supa') || key.toLowerCase().includes('secret')) {
    console.log(`${key}: ${process.env[key] ? '***' : 'empty'}`);
  } else {
    console.log(key);
  }
});
