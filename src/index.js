// require('dotenv').config({path:'./env'})
import dotenv from "dotenv";
dotenv.config()
import connectDB from "./db/index.js";

connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000 ,()=>{
        console.log(`server is listening on ${process.env.PORT}`)
    })
})
.catch((err)=>{
    console.log("MongoDB connection failed !!",err);
    
})

 

















// import express from "express"
// const app = express()
// (async()=>{
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//         app.on("error",(error)=>{
//             console.error("ERROR",error);
//             throw error
//         })
//         app.listen(process.env.PORT , ()=>{
//             console.log(`app is. listening on port${process.env.PORT}`)
//         })
//     } catch (error) {
//         console.error("ERROR",error)
//         throw error
//     }
// })()