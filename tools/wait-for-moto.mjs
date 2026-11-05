// Waits until the emulator answers, so "npm run moto:up" returns when it is ready.
const url = `${process.env.AWS_ENDPOINT_URL ?? 'http://localhost:5000'}/moto-api/`;
for (let attempt = 0; attempt < 60; attempt++) {
  try {
    const response = await fetch(url);
    if (response.ok) {
      console.log('The emulator is ready.');
      process.exit(0);
    }
  } catch {
    // not up yet
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
console.error('The emulator did not start within 60 seconds. Is Docker running?');
process.exit(1);
