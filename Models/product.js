const mongoose = require('mongoose');

// Define the product schema
const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  // category: { // Reference to the category schema
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: 'Category',
  //   required: true,
  // },

  category: { // Reference to the category schema
    type: String,
    required: true,
  },

  description: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
    required: true,
  },
  imageUrls: { // Updated to allow multiple images
    type: [String], // Array of strings for multiple image URLs
    required: true,
  },
  brand: {
    type: String,
    required: true,
  },
  type: { // Product type
    type: String,
    required: true,
  },
  mfg: { // Manufacture date
    type: Date,
    required: true,
  },
  sku: { // Stock Keeping Unit
    type: String,
    required: true,
    unique: true,
  },
  tags: { // Product tags
    type: [String], // Array of strings
    default: [],
  },
  stock: { // Stock quantity
    type: Number,
    required: true,
    min: 0,
  },
  sold: { // sold quantity
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0,
  },
  price: {
    type: Number,
    required: true,
  },
  originalPrice: {
    type: Number,
    required: true,
  },
  discount: { // New field for discount
    type: Number, // Can represent a percentage (e.g., 20 for 20% off)
    min: 0,
    max: 100,
    default: 0, // Default discount is 0%
  },
  badge: {
    type: String,
    default: "",
  },
  badgeColor: { // New field for badge color
    type: String, // Can be a color name, hex code, etc.
    default: "#000000", // Default to black color (hex code)
  },
  vendor: {
    type: String,
    required: true,
  },
  // Technical Specifications as an array of objects
  specifications: { // Product specifications
    type: [String], // Array of strings
    default: [],
  },
  suggestedUse: { // Suggested use for the product
    type: [String], // Array of strings
    default: [],
  },
  warnings: { // Warnings related to the product
    type: [String], // Array of strings
    default: [],
  },
  packageIncludes: { // Items included in the package
    type: [String], // Array of strings
    default: [],
  },
  warranty: { // Warranty information
    type: String, // Can be a string describing warranty
    default: "",
  },
  features: { // Key features of the product
    type: [String], // Array of strings
    default: [],
  },
  additionalInfo: { // Additional information about the product
    type: String, // Can hold additional notes or information
    default: "",
  },
  highlights : { // Key highlights  of the product
    type: [String], // Array of strings
    default: [],
  },
  // Boolean fields for website sections
  isPopular: {
    type: Boolean,
    default: false,
  },
  isDailySell: {
    type: Boolean,
    default: false,
  },
  isDealOfTheDay: {
    type: Boolean,
    default: false,
  },
  isTopSelling: {
    type: Boolean,
    default: false,
  },
  isTrending: {
    type: Boolean,
    default: false,
  },
  isRecentlyAdded: {
    type: Boolean,
    default: false,
  },
  isTopRated: {
    type: Boolean,
    default: false,
  },
  viewCount: {
    type: Number,
    default: 0,
  },
  
}, { timestamps: true });

// Create a model from the schema
const Product = mongoose.model('Product', productSchema);

module.exports = Product;
