import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

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

export {registerUser}