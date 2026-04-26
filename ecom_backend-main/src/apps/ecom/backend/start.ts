import 'dotenv/config';
import { Container } from './Container';
import { Server } from './Server';

console.log('START FILE RUNNING...');
console.log('PORT =', process.env.PORT);
console.log('JWT_SECRET_KEY =', process.env.JWT_SECRET_KEY ? 'SET' : 'MISSING');
console.log('DATABASE_URL =', process.env.DATABASE_URL ? 'SET' : 'MISSING');

const container = new Container();
const server = container.invoke().resolve<Server>('server');

server
  .start()
  .then(() => {
    console.log('Server started successfully');
  })
  .catch((err: Error) => {
    console.error('Error starting server:', err);
    process.exit(1);
  });

process.on('exit', (code) => {
  console.log('Process exiting with code:', code);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});