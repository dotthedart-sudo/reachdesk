async function test() {
  const ip = '8.8.8.8';
  try {
    const res1 = await fetch(`https://ipapi.co/${ip}/json/`);
    console.log('ipapi.co status:', res1.status);
    console.log('ipapi.co response:', await res1.json());
  } catch (err) {
    console.log('ipapi.co error:', err.message);
  }

  try {
    const res2 = await fetch(`https://freeipapi.com/api/json/${ip}`);
    console.log('freeipapi.com status:', res2.status);
    console.log('freeipapi.com response:', await res2.json());
  } catch (err) {
    console.log('freeipapi.com error:', err.message);
  }
}

test();
