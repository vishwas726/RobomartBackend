const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        // required: [true, "Your email address is required"],
        // unique: true,
    },
    password: {
        type: String,
        required: [true, "Your password is required"],
    },
    phoneNumber: {
        type: String,
        trim: true,
        match: [/^\+?\d{10,15}$/, 'Please enter a valid phone number'],
        // Add this if phone number is mandatory
        required: [true, "Your Phone Number is required"],
        unique: true
    },
    alternativePhoneNumber: {
        type: String,
        trim: true,
        match: [/^\+?\d{10,15}$/, 'Please enter a valid alternative phone number'],
    },
    address: [{
        street: { type: String },
        city: { type: String },
        state: { type: String },
        postalCode: { type: String },
        country: { type: String }
    }],
    orders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    }],
    cart: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        quantity: { type: Number, required: true, min: 1 }
    }],
    wishList: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],

    reviews: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        reviewText: {
            type: String,
            required: true,
            minlength: 10,

        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]


}, {
    timestamps: true // Automatically creates createdAt and updatedAt fields
});

// Hash password before saving
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next(); // Hash only if password is modified
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

module.exports = mongoose.model('User', userSchema);
