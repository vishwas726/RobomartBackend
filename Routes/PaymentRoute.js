const express = require("express");
const Razorpay = require("razorpay");
const router = express.Router();

const razorpay = new Razorpay({
  key_id: "rzp_test_LEKd2zV6V30c7e",
  key_secret: "VK2PXpyP2swyXrLUrYi5zXmv",
});

router.post("/create-order", async (req, res) => {
  const { amount } = req.body;

  try {
    const order = await razorpay.orders.create({
      amount: amount * 100, // Amount in paise
      currency: "INR",
      receipt: `order_rcptid_${Date.now()}`,
    });

    res.status(200).json({ orderId: order.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create Razorpay order" });
  }
});

module.exports = router;