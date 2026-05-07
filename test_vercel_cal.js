async function run() {
  const url = 'https://agendamento-ashy.vercel.app/api/google-calendar?startDate=2026-05-18T00:00:00.000Z&endDate=2026-05-25T00:00:00.000Z';
  try {
    const res = await fetch(url);
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Body:', text);
  } catch (err) {
    console.error(err);
  }
}
run();
