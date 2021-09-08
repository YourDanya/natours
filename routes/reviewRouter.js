const express=require('express');
const reviewController=require('./../controllers/reviewController')
const Tour=require(`./../models/tourModel.js`)
const authController= require('./../controllers/authController')
const bookingController= require('../controllers/bookingController2')

const router=express.Router({mergeParams: true});

router.use(authController.protect)

router.route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo('user'),
    reviewController.setTourUserIds,
    reviewController.createReview);

router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview
  )
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview
  )


module.exports=router