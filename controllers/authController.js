const jwt= require('jsonwebtoken')
const User= require('./../models/userModel')
const AppError= require('./../utils/appError')
const catchAsync= require('./../utils/catchAsync')
const {promisify}= require('util')
const Email= require('./../utils/email')
const crypto= require('crypto')

const signToken=  id =>{

  return jwt.sign({id},   process.env.JWT_SECRET,{
    expiresIn: process.env.JWT_SECRET_IN
  });

}

const createSendToken= (user, statusCode, res) =>{
  const token= signToken(user._id);
  const cookieOptions= {
    expires: new Date(Date.now()+process.env.JWT_COOKIES_EXPIRES_IN*24*3600*1000),
    httpOnly: true
  }

  if(process.env.NODE_ENV=== 'production') cookieOptions.secure=true

  res.cookie('jwt', token, cookieOptions);

  user.password=undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  })

}

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm
  });

  const url = `${req.protocol}://${req.get('host')}/me`;
  console.log(url);
  await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, res);
});


exports.login= catchAsync(async (req, res, next)=>{
  const {email, password}= req.body;

  if(!email || !password){
    return next(new AppError('please provide email and password', 400));
  }

  const user=await User.findOne({email}).select('+password');

  // console.log(user);

  if(!user ||!await user.correctPassword(password, user.password)){
    return next(new AppError('Incorrect email or password', 401));
  }

  createSendToken(user, 200, res);

})

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({ status: 'success' });
};


exports.protect =catchAsync(async(req, res, next)=>{
  // get token and check
  let token;
  if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')){
    token= req.headers.authorization.split(' ')[1];
  } else if(req.cookies.jwt) {
    token= req.cookies.jwt
  }


  if(!token){
    return next(new AppError('You are not logged in! Please Log in to get access.', 401));
  }
  // verification token
  const decoded=await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // check if user still exists
  const currentUser= await User.findById(decoded.id);


  if(!currentUser){
    return next(new AppError('the user belonging to this token does no longer exist', 401));
  }

  // check if user changed password after the token was issued

  if(currentUser.changedPasswordAfter(decoded.iat)){
    return next (new AppError('user recently changed password! please login again', 401));
  }

  req.user=currentUser;
  res.locals.user=currentUser
  next();
})

exports.isLoggedIn = async (req, res, next) => {

  if (req.cookies.jwt) {
    try {
      // 1) verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);

      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin', 'lead-guide']. role='user'
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next();
  };
};


exports.forgotPassword=catchAsync( async(req, res, next) =>{
  //1 get user based on posted email
  const user= await User.findOne({email: req.body.email})

  if(!user){
    return next(new AppError('there is no user with that email address', 404));
  }

  //2 generate the random reset token
  const resetToken= user.createPasswordResetToken();
  await user.save({validateBeforeSave: false});


  //3 send it to user's email
  const resetURL= `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;

  const message= `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\n
  If you didn't forget your password, please ignore this email`

  try{
    console.log('yes');
    await sendEmail({
      email: user.email,
      subject: 'you password reset token (valid for 10 minutes)',
      message
    })

    res.status(200).json({
      status: 'success',
      message: 'token send to email!'
    })
  } catch(err){
    user.passwordResetToken=undefined;
    user.passwordResetExpires=undefined;
    await user.save({validateBeforeSave: false});

    return new AppError('There was an error sending an email. Try again later!', 500)
  }


})

exports.resetPassword= catchAsync( async (req, res, next) =>{
  // 1 get user based on token
  const hashedToken= crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  // 2 if token has not expired and there is a user
  const user= await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: {$gt: new Date()}
  });

  if(!user){
    return next(new AppError('Token is invalid or expired', 400));
  }

  user.password= req.body.password;
  user.passwordConfirm= req.body.passwordConfirm;
  user.passwordResetToken= undefined;
  user.passwordResetExpires= undefined;

  await user.save();

  // 3 update changed passwordAt property for the user


  // 4 log the user in, send jwt

  createSendToken(user, 200, res);

})

exports.updateMyPassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select('+password');

  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }

  // 3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // User.findByIdAndUpdate will NOT work as intended!

  // 4) Log user in, send JWT
  createSendToken(user, 200, res);
});
