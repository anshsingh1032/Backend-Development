import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken "
import { use } from "react";

const generateAccessAndRefreshToken = async(userId)=>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken=refreshToken
        await user.save({validateBeforeSave:false})
        return{accessToken,refreshToken }

    } catch (error) {
        throw new ApiError(500,"something went wrong on generating access and refresh token")
    }

}

const registerUser = asyncHandler(async (req,res)=>{
    //get user details from frontend
    //validation-not empty
    //check if - user already exists : username , email
    //check for images and avatar
    //upload them to cloudinary , avatar
    //create user object - create entry in db
    //remove password and refresh token field from response
    //check for user creation
    //return response
    const {username,fullName,email,password} = req.body

    // if (fullName==="") {
    //     throw new apiError(400,"fullname is required")
    // } either do it by this way for every field 
    if ([username,email,fullName,password].some((field)=>field?.trim()==="")
    ) {
        throw new ApiError(400,"all fields are required")
    }
    const existedUser = await User.findOne({
        $or:[{ email },{ username }]
    })
    if (existedUser) {
        throw new ApiError(409,"user with this email or username already exists ")
    }
    // console.log(req.files)  
    const avatarLocalPath = req.files?.avatar[0]?.path
    // console.log(avatarLocalPath);
    
    // const coverImageLocalPath = req.files?.coverImage[0]?.path
     let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    if (!avatarLocalPath) {
        throw new ApiError(400,"avatar file is required")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    // console.log(avatar);
    
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    // console.log(coverImage);
    
    if (!avatar) {
        throw new ApiError(400,"avatar file is required 2")
    }
    const user = await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        password,
        email,
        username:username.toLowerCase()
    })
    const createdUser  = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    return res.status(201).json(
        new ApiResponse(200,createdUser,"user registered successfully")
    )
})
const loginUser = asyncHandler(async (req,res)=>{
    const{username,email,password}=req.body
    if(!username && !email){
        throw new ApiError(400,"username or email is required")
    }
    const user = await User.findOne({
        $or:[{username},{email}]
    })
    if(!user){
        throw new ApiError(404,"user does not exists")
    }
    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401,"Invalid user credentials")
    }
    const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly:true,
        secure:true
    }
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user:loggedInUser,accessToken,refreshToken
            },
            "User logged in successfully"
        )
    )
})
const logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
    )

    const options = {
        httpOnly:true,
        secure:true
    }
    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200 , {} , "User logged Out"))
})
const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401,"Unauthorised Request")
    }
    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        const user = await User.findById(decodedToken?._id)
        if (!user) {
            throw new ApiError(401,"invalid refresh token")
        }
        if (incomingRefreshToken!==user?.refreshToken) {
            throw new ApiError(401,"Refresh token is expired or used ")
        }
        const options = {
            httpOnly:true,
            secure:true
        }
        const {accessToken,newRefreshToken}=await generateAccessAndRefreshToken(user._id)
    
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refrehToken",newRefreshToken,options)
        .json(
            new ApiResponse (
                200,
                {accessToken,refreshToken:newRefreshToken},
                "Access token refreshed"    
            )
        )
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid refresh token ")
    }
})
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}