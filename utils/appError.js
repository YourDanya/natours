class AppError extends Error{
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    this.message=message;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    console.log(message);
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports=AppError

