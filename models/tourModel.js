const mongoose=require('mongoose');
const slugify= require('slugify');
const validator= require('validator');
const User= require('./userModel')

const tourSchema=new mongoose.Schema({
  name: {
    type: String,
    required: [true, `A tour must have a name`],
    unique: true,
    trim: true,
    maxlength: [40, 'a tour name must have less ot equal then 40 characters'],
    minlength: [10, 'a tour name mush have more or equal then 10 characters'],
    // validate: [validator.isAlpha, 'Tour name must only contain characters']
  },
  slug: {
    type: String
  },
  price: {
    type: Number,
    required: [true, `A tour must have a price`]
  },
  duration: {
    type: Number,
    required: [true, 'A tour must have a duration']
  },
  maxGroupSize: {
    type: Number,
    required: [true, 'A tour must have a group size']
  },
  difficulty: {
    type: String,
    required: [true, 'A tour must have a difficulty'],
    enum: {
      values: ['easy', 'medium', 'difficult'],
      message: 'Difficulty is either: easy, medium, difficult'
    }
  } ,
  ratingsAverage: {
    type: Number,
    default: 4.5,
    min: [1, 'Rating must be above 1.0'],
    max: [5, 'Rating must be below 5.0'],
    set: val => val.toFixed(1)
  },
  ratingsQuantity: {
    type: Number,
    default: 0
  },
  priceDiscount: {
    type: Number,
    validate: {
      message: 'discount price ({VALUE}) should be below regular price',
      validator: function(val){
        return val<this.price;
      }
    }
  },
  summary: {
    type: String,
    trim: true,
    required: [true, 'A tour must have a description']
  },
  description: {
    type: String,
    trim: true
  },
  imageCover: {
    type: String,
    required: [true, 'A tour must have a cover image']
  },
  images: [String],
  createdAt: {
    type: Date,
    default: Date.now(),
    select: false
  },
  startDates: [Date],
  secretTour: {
    type: Boolean,
    default: false
  },
  startLocation: {
    //GeoJSON
    type: {
      type: String,
      default: 'Point',
      enum: ['Point']
    },
    coordinates: [Number],
    address: String,
    description: String
  },
  locations: [
    {
      type: {
        type: String,
        default: 'Point',
        enum: ['Point']
      },
      coordinates: [Number],
      address: String,
      description: String,
      day: Number
    }
  ],
  guides: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    }
  ]
},
  {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
}
);

tourSchema.index({price: 1, ratingsAverage: -1})
tourSchema.index({startLocation: '2dsphere'})


tourSchema.virtual('durationWeeks').get(function(){
  return this.duration/7;
})

//virtual populate
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id'
})


////document middleware
tourSchema.pre('save', function(next){
  this.slug=slugify(this.name, {lower: true});
  next();
})

// tourSchema.pre('save',  async function( next){
//   const guidesPromises= this.guides.map(async id => await User.findById(id));
//   this.guides= await Promise.all(guidesPromises);
//   next();
// })


////query middleware

tourSchema.pre(/^find/, function(next){
  this.find({secretTour: {$ne: true}})
  this.start= Date.now();
  next();
})

tourSchema.pre(/^find/, function(next){
  this.populate({
    path: 'guides',
    select: '-__v'
  })
  next();
})

tourSchema.post(/^find/, function(doc, next){
  console.log(`Query took ${Date.now()-this.start} milliseconds`);
  next();
})



////aggregation middleware
// tourSchema.pre('aggregate', function(next){
//   this.pipeline().unshift({ $match: {secretTour: {$ne: true}}});
//   next();
// });

const Tour=mongoose.model('Tour', tourSchema);

module.exports= Tour;















