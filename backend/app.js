import dotenv from 'dotenv';
import express from 'express';
import authRouter from './routes/authRouter.js';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pool from './config/db.js';


dotenv.config();
const app=express();

app.use(cors({
    origin: "http://localhost:5173", 
    credentials: true                
}));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/',(req,res,next)=>{
    console.log(req.method , req.url);
    next();
})

// app.use('/auth', authRouter);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await pool.query('SELECT 1'); // Test the database connection
        console.log("Database connected successfully.");
        
        app.listen(PORT,()=>{
            console.log(`Server is running on http://localhost:${PORT}/`);
        });
    } catch (err) {
        console.log("Failed to start server due to DB connection error..", err);
        process.exit(1);
    }
};
startServer();