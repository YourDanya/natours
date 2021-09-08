const tourRouter=require('./routes/tourRouter');
const userRouter=require('./routes/userRouter');
const reviewRouter=require('./routes/reviewRouter');
const viewRoutes= require('./routes/viewRoutes')
const bookingRoutes= require('./routes/bookingRoutes')
const express =require('express');
const morgan=require('morgan');
const compression=require('compression')
const appError=require('./utils/appError')
const globalErrorHandler= require('./controllers/errorController')
const app=express();
const rateLimit= require('express-rate-limit')
const helmet= require('helmet')
const mongoSanitize= require('express-mongo-sanitize')
const xss= require('xss-clean')
const hpp= require('hpp')
const path= require('path')
const cookieParser= require('cookie-parser')
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

//1) middleware

app.use(express.static(path.join(__dirname, 'public')));

//body parser, reading data from the body into req.body
app.use(express.json({limit: '10kb'}));
app.use(express.urlencoded({extended: true, limit: '10kb'}))
app.use(cookieParser())


// data sanitization against NoSql query injection
app.use(mongoSanitize());

// data sanitization against XSS
app.use(xss());

//prevent parameter pollution
app.use(hpp({
   whitelist: [
     'duration',
     'ratingsQuantity',
     'ratingsAverage',
     'maxGroupSize',
     'difficulty',
     'price'
   ]
}));

//serving static files


//test middleware

app.use((req, res, next) =>{
   req.requestedTime=new Date().toISOString();
   // console.log(req.cookies)
   next();
})

//set security http headers
// app.use(
//   helmet.contentSecurityPolicy({
//     directives: {
//       defaultSrc: ["'self'", 'data:', 'blob:'],
//
//       fontSrc: ["'self'", 'https:', 'data:'],
//
//       scriptSrc: ["'self'", 'unsafe-inline'],
//
//       scriptSrc: ["'self'", 'https://*.cloudflare.com'],
//
//       scriptSrc: ["'self'", 'https://js.stripe.com/v3/'],
//
//       scriptSrcElem: ["'self'",'https:', 'https://*.cloudflare.com'],
//
//       styleSrc: ["'self'", 'https:', 'unsafe-inline'],
//
//       connectSrc: ["'self'", 'data', 'https://*.cloudflare.com']
//     },
//   })
// );

//development logging
if(process.env.NODE_ENV==='development'){
   app.use(morgan('dev'));
}

//limit requests from same API
const limiter= rateLimit({
   max: 100,
   windowMs: 3600*1000,
   message: 'Too many requests from this IP, please try again in an hour!'
})

app.use(limiter);

app.use(compression())

//2) route handlers


//3) routes

app.use('/', viewRoutes)
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRoutes);

app.all('*', (req, res, next)=>{
   next(new appError(`can t find ${req.originalUrl} on this server`, 404));
});



app.use(globalErrorHandler);

module.exports=app;
