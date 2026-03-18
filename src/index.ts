import express, {Request, Response} from 'express';
import cors from 'cors';
import subjectRouter from './routes/subjects';
import securityMiddleware from "./middleware/security";


const app = express();
const port = 8000;

if (!process.env.FRONTEND_URL) {
  throw new Error('FRONTEND_URL is not set in .env file');
}
app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

app.use(express.json());

app.use(securityMiddleware);

app.use('/api/subjects', subjectRouter);

app.get('/', (req: Request, res: Response) => {
  res.send('Welcome to the Classroom API!');
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
