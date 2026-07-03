async function test() {
  const ips = ['111.88.0.1', '8.8.8.8', '103.109.168.1'];
  for (const ip of ips) {
    try {
      const res = await fetch(`https://freeipapi.com/api/json/${ip}`);
      const data = await res.json();
      console.log(`IP: ${ip} -> Country: ${data.countryCode}, Currencies:`, data.currencies);
    } catch (err) {
      console.error(ip, err.message);
    }
  }
}

test();
