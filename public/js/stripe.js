/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';
const stripe = Stripe('pk_test_51JW1QYDfWEXRpN4Ai238FLr4rXgD13EAbVPEHAPgBYkYJySXeDpS6C1rnUsAUyUQEeKFZpacSl7iHY6Yr9QgADZe00AADhoL04');
// import {loadStripe} from '@stripe/stripe-js';
//
// const stripe  = loadStripe('pk_test_51JW1QYDfWEXRpN4Ai238FLr4rXgD13EAbVPEHAPgBYkYJySXeDpS6C1rnUsAUyUQEeKFZpacSl7iHY6Yr9QgADZe00AADhoL04');

export const bookTour = async tourId => {
  try {
    const session = await axios(
      `/api/v1/bookings/checkout-session/${tourId}`
    );

    // 2) Create checkout form + chanre credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id
    });

  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
