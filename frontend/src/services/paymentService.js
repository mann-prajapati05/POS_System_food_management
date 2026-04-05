import api from './api';

export async function processOrderPayment(orderId, payload) {
  const { data } = await api.post(`/staff/orders/${orderId}/payment`, payload);
  return data;
}

export async function createRazorpayOrder(payload) {
  const { data } = await api.post('/api/payments/create-order', payload);
  return data;
}

export async function verifyRazorpayPayment(payload) {
  const { data } = await api.post('/api/payments/verify', payload);
  return data;
}

let razorpayScriptPromise;

export function ensureRazorpayLoaded() {
  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  if (razorpayScriptPromise) {
    return razorpayScriptPromise;
  }

  razorpayScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error('Failed to load Razorpay checkout'));
    document.body.appendChild(script);
  });

  return razorpayScriptPromise;
}
