
  const dotenv= require('dotenv');
  const app=require('./app');
  const mongoose=require('mongoose');

  process.on('uncaughtException', err=>{
    console.log('unhandled exception! shutting down...');
    console.log(err.name, err.message);
    process.exit(1);
  })

  dotenv.config({path: `${__dirname}/config.env`});

  const DB=process.env.DATABASE;

  mongoose.connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false
  }).then(con => {
    console.log('DB connection successful')
  });

const server= app.listen(process.env.PORT|| 3000, ()=>{
})

  process.on('unhandledRejection', err =>{
    console.log('unhandled rejection! shutting down...');
    console.log(err);
    server.close(()=>{
      process.exit(1);
    })
  })



//test