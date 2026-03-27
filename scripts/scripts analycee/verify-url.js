import https from 'https';

const url = "https://cloud10.todocoleccion.online/libros-segunda-mano-geografia-viajes/tc/2019/02/25/13/152752794_126182325.jpg";

https.get(url, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
  res.resume();
}).on('error', (e) => {
  console.error('Error:', e);
});
