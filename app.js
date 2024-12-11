const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Product = require("./Models/product");
const Category = require("./Models/category");
const cookieParser = require("cookie-parser");
const authRoute = require("./Routes/AuthRoute");
const cors = require('cors');
require('dotenv').config(); // Load environment variables from .env file
const jwt = require("jsonwebtoken");
const User = require("./Models/user")
const session = require('express-session')
const MongoStore = require('connect-mongo');
// const { Cookies } = require('react-cookie');

const Order=require("./Models/order")

// const productRoutes = require('./route/product'); // Import product routes
// const userRoutes = require('./route/user'); // Import user routes
const Razorpay = require("razorpay");

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID, // Store your Razorpay key in environment variables
  key_secret: process.env.RAZORPAY_KEY_SECRET, // Store your Razorpay secret in environment variables
});

const app = express();

app.use(cors({
  origin: '*', // This allows requests from any origin
  credentials: true // If you want to include credentials (cookies, authorization headers, etc.)
}));

// Body-parser middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const dbURI = process.env.MONGO_URI; // MongoDB URI from .env

// Function to connect to the database
const connectDB = async () => {
  try {
    await mongoose.connect(dbURI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds instead of 30
    });
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);

    // Retry connecting after 5 seconds if initial connection fails
    setTimeout(connectDB, 5000);
  }
};


// Establish connection to the database
connectDB();

// Listen for errors after initial connection
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error occurred:', err.message);
});

// Set the view engine to EJS
app.set('view engine', 'ejs');

// Cloudinary configuration using environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Set up multer storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'uploads', // the folder in Cloudinary where images will be stored
    format: async () => 'png', // optional: specify format like 'png', 'jpg'
    public_id: (req, file) => file.originalname, // use the original filename as the public ID
  },
});

app.use(cookieParser());

app.use(express.json());

app.use("/", authRoute);

const verify = (req, res, next) => {

  const authHeader = req.headers.authorization;

  if (authHeader) {

    // const token =req.cookies.token || authHeader.split(" ")[1];
     const token = authHeader.split(" ")[1];

    jwt.verify(token, process.env.TOKEN_KEY, (err, user) => {
      if (err) {
        return res.status(403).json("Token is not valid!");
      }

      req.user = user;
      next();
    });

  } else {
    res.status(401).json("You are not authenticated!");
  }
};


app.delete("/users/:userId", verify, (req, res) => {
  if (req.user) {
    res.status(200).send(`User with ID ${req.user.id} has been deleted.`);
  } else {
    res.status(403).send("You are not allowed to delete this user!");
  }
});

app.post("/logout", (req, res) => {
  // Clear the token cookie
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,  // Set to `true` in production if using HTTPS
    sameSite: "strict",  // Helps prevent CSRF attacks
  });
  res.status(200).json({ message: "User logged out successfully" });
});


// Initialize multer with the storage configuration
const upload = multer({ storage });





// Endpoint for uploading images
app.post('/upload', upload.single('image'), (req, res) => {
  if (req.file) {
    res.json({
      message: 'Image uploaded successfully!',
      imageUrl: req.file.path, // Cloudinary URL to the uploaded image
    });
  } else {
    res.status(400).json({ error: 'No image provided!' });
  }
});


// Serve a basic HTML form for uploading images
app.get('/upload', (req, res) => {
  res.send(`
    <form action="/upload" method="post" enctype="multipart/form-data">
      <input type="file" name="image" accept="image/*" />
      <button type="submit">Upload Image</button>
    </form>
  `);
});



// POST route to add a new category
app.post('/add-category', upload.single('image'), async (req, res) => {
  const { name } = req.body;
  const image = req.file ? req.file.path : ''; // Get the uploaded image path

  const newCategory = new Category({
    name,
    image
  });

  try {
    await newCategory.save();
    res.redirect('/categories'); // Redirect to the categories page after adding
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

// GET route to display categories
app.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find(); // Fetch all categories from the database
    res.render('categories', { categories }); // Render the categories view
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});
// GET route to fetch categories as JSON
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await Category.find(); // Fetch all categories from the database
    res.json(categories); // Return the categories as JSON
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" }); // Return an error message in JSON format
  }
});
app.post('/add-product', upload.array('imageUrls', 10), async (req, res) => {
  try {
    const {
      name,
      category,
      description,
      brand,
      type,
      mfg,
      sku,
      tags,
      stock,
      rating,
      price,
      originalPrice,
      discount,
      badge,
      badgeColor,
      vendor,
      specifications,
      suggestedUse,
      warnings,
      packageIncludes,
      features,
      highlights,
    } = req.body;

    // Collect all uploaded image URLs
    const imageUrls = req.files.map(file => file.path);

    const newProduct = new Product({
      name,
      category,
      description,
      imageUrl: imageUrls[0], // Use the first uploaded image as the main image
      additionalImages: imageUrls.slice(1), // Store remaining images in an array
      brand,
      type,
      mfg,
      sku,
      tags: tags || [],
      stock,
      rating,
      price,
      originalPrice,
      discount,
      badge,
      badgeColor,
      vendor,
      specifications: specifications || [],
      suggestedUse: suggestedUse || [],
      warnings: warnings || [],
      packageIncludes: packageIncludes || [],
      features: features || [],
      highlights: highlights || [],
    });

    await newProduct.save();
    res.status(201).json({ message: 'Product added successfully!', product: newProduct });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ error: 'An error occurred while adding the product.' });
  }
});


// GET route to display the form and the list of products
app.get('/', async (req, res) => {
  try {
    const products = await Product.find(); // Retrieve all products
    res.render('index', { products }); // Render the page with products
  } catch (err) {
    console.error('Error fetching product:', err.message);
    res.status(500).json({ error: 'Server error' }); // Handle server errors
  }

});

// GET route to retrieve products for each section
app.get('/popular', async (req, res) => {
  try {
    const popularProducts = await Product.find({
      $or: [
        { isPopular: true },
        { sold: { $gte: await getTopPercentageSold(90) } } // Example: Get products in top 10%
      ]
    });
    res.json({ products: popularProducts });
  } catch (err) {
    console.error('Error fetching product:', err.message);
    res.status(500).json({ error: 'Server error' }); // Handle server errors
  }

});

const getTopPercentageSold = async (percentage) => {
  const products = await Product.find().sort({ sold: -1 }); // Sort by sold count
  const index = Math.floor(products.length * (percentage / 100));
  return products[index].sold; // Return sold count at the given percentage
};


app.get('/daily-sells', async (req, res) => {
  try {
    const products = await Product.find({ isDailySell: true }); // Retrieve daily sell products
    res.json({ products });
  } catch (err) {
    console.error('Error fetching product:', err.message);
    res.status(500).json({ error: 'Server error' }); // Handle server errors
  }

});

app.get('/deals-of-the-day', async (req, res) => {

  try {
    const products = await Product.find({ isDealOfTheDay: true }); // Retrieve deals of the day
    res.json({ products });
  } catch (err) {
    console.error('Error fetching product:', err.message);
    res.status(500).json({ error: 'Server error' }); // Handle server errors
  }


});

app.get('/top-selling', async (req, res) => {

  try {
    const topSellingProducts = await Product.find({
      $or: [
        { isTopSelling: true },
        { sold: { $gte: await getTopPercentageSold(95) } } // Example: Top 5% sold products
      ]
    }).limit(4);
    res.json({ products: topSellingProducts });
  } catch (err) {
    console.error('Error fetching product:', err.message);
    res.status(500).json({ error: 'Server error' }); // Handle server errors
  }

});


app.get('/trending-products', async (req, res) => {
  try {
    const trendingProducts = await Product.find({
      $or: [
        { isTrending: true },
        { isRecentlyAdded: true, sold: { $gte: await getTopPercentageSold(80) } } // Trending if recently added and selling well
      ]
    }).limit(4);
    res.json({ products: trendingProducts });
  } catch (err) {
    console.error('Error fetching product:', err.message);
    res.status(500).json({ error: 'Server error' }); // Handle server errors
  }

});


app.get('/recently-added', async (req, res) => {
  try {
    const products = await Product.find({ isRecentlyAdded: true }).limit(4); // Retrieve recently added products
    res.json({ products });
  } catch (err) {
    console.error('Error fetching product:', err.message);
    res.status(500).json({ error: 'Server error' }); // Handle server errors
  }

});

app.get('/top-rated', async (req, res) => {

  try {
    const topRatedProducts = await Product.find({
      $or: [
        { isTopRated: true },
        { rating: { $gte: 4.5 } } // Example: Products with ratings of 4.5 and above
      ]
    }).limit(4);
    res.json({ products: topRatedProducts });
  } catch (err) {
    console.error('Error fetching product:', err.message);
    res.status(500).json({ error: 'Server error' }); // Handle server errors
  }


});

// GET route to find a product by ID and increment the view count
app.get('/product/:id', async (req, res) => {
  try {
    const { id } = req.params; // Extract the ID from the request parameters

    // Find the product by ID and increment the viewCount by 1
    const product = await Product.findByIdAndUpdate(
      id,
      { $inc: { viewCount: 1 } }, // Increment the viewCount field
      { new: true } // Return the updated document after the increment
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' }); // Handle not found case
    }

    res.json(product); // Return the updated product details as a JSON response
  } catch (err) {
    console.error('Error fetching product:', err.message);
    res.status(500).json({ error: 'Server error' }); // Handle server errors
  }
});


// GET route to find related products by tags and type
app.get('/related-products/:id', async (req, res) => {
  try {
    const { id } = req.params; // Extract the product ID from the request parameters

    // Find the product by ID to get its tags and type
    const product = await Product.findById(id).limit(4);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' }); // Handle not found case
    }

    // Find related products using the tags and type of the current product
    const relatedProducts = await Product.find({
      _id: { $ne: id }, // Exclude the current product
      $or: [
        { tags: { $in: product.tags } }, // Match by tags
        { type: product.type } // Match by type
      ]
    }).limit(10); // Limit the number of related products returned

    res.json(relatedProducts); // Return the related products as a JSON response
  } catch (err) {
    console.error('Error fetching related products:', err.message);
    res.status(500).json({ error: 'Server error' }); // Handle server errors
  }
});


// Search products by name, tag, or type
app.get('/search', async (req, res) => {
  try {
    const { name } = req.query; // Get the search term from the query parameters

    if (!name) {
      return res.status(400).json({ error: 'Search term is required' }); // Handle missing search term
    }

    // Find products by name, tags, or type using a case-insensitive search
    const products = await Product.find({
      $or: [
        { name: { $regex: name, $options: 'i' } },  // Search by name (case-insensitive)
        { tags: { $regex: name, $options: 'i' } },  // Search by tags (case-insensitive)
        { type: { $regex: name, $options: 'i' } }   // Search by type (case-insensitive)
      ]
    });

    if (products.length === 0) {
      return res.status(404).json({ message: 'No products found' }); // Handle no matches
    }

    res.json(products); // Return the matching products as a JSON response
  } catch (err) {
    console.error('Error searching for products:', err.message);
    res.status(500).json({ error: 'Server error' }); // Handle server errors
  }
});


// Route to search products by category
app.get('/searchByCategory', async (req, res) => {
  try {
    const { category } = req.query; // Get the category from the query parameters

    if (!category) {
      return res.status(400).json({ error: 'Category is required' }); // Handle missing category
    }

    // Find products matching the specified category (case-insensitive)
    const products = await Product.find({
      category: { $regex: category, $options: 'i' } // Case-insensitive match for category
    });

    if (products.length === 0) {
      return res.status(404).json({ message: 'No products found for this category' }); // Handle no matches
    }

    res.json(products); // Return the matching products as a JSON response
  } catch (err) {
    console.error('Error searching products by category:', err.message);
    res.status(500).json({ error: 'Server error' }); // Handle server errors
  }
});



//for add to cart
app.post('/cart', verify, async (req, res) => {
  const { productId, quantity } = req.body;

  try {
    const user = await User.findById(req.user.id).populate({
      path: "cart.productId", // Populate the productId field in the cart
      model: "Product", // Replace 'Product' with your actual Product model name
    });

    

    const existingItem = user.cart.find(item => item.productId && item.productId.equals(productId));

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      user.cart.push({ productId, quantity });
    }

    await user.save();
    res.status(200).json({ message: "Cart updated successfully", cart: user.cart });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update cart" });
  }
});


app.get("/cart", verify, async (req, res) => {
  try {
    // Find the user and populate the product details for each item in the cart
    const user = await User.findById(req.user.id).populate({
      path: "cart.productId", // Populate the productId field in the cart
      model: "Product", // Replace 'Product' with your actual Product model name
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Format the cart data
    const result = user.cart;

    const cart = result.map((item) => {
      if (item.productId) {
        // Only call .toObject() if productId is populated
        return { ...item.productId.toObject(), quantity: item.quantity };
      }
      // Handle case where productId is not populated
      return { productId: null, quantity: item.quantity };
    });

    res.status(200).json({ cart });

  } catch (error) {
    console.error("Error fetching cart data:", error);
    res.status(500).json({ message: "Failed to get cart", error });
  }
});


app.put('/cart/:productId', verify, async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;

  try {
    const user = await User.findById(req.user.id).populate({
      path: "cart.productId", // Populate the productId field in the cart
      model: "Product", // Replace 'Product' with your actual Product model name
    });

    const item = user.cart.find(item => item.productId.equals(productId));

    if (!item) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    item.quantity = quantity;
    await user.save();


    const result = user.cart;

    const cart = result.map((item) => {

      return { ...item.productId.toObject(), quantity: item.quantity }

    })

    res.status(200).json({ cart });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update cart" });
  }
});




app.delete('/cart/:productId', verify, async (req, res) => {
  const { productId } = req.params;

  try {
    const user = await User.findById(req.user.id).populate({
      path: "cart.productId", // Populate the productId field in the cart
      model: "Product", // Replace 'Product' with your actual Product model name
    });

    const itemIndex = user.cart.findIndex(item => item.productId.equals(productId));

    if (itemIndex === -1) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    user.cart.splice(itemIndex, 1); // Remove the item from the cart
    await user.save();

    const result = user.cart;

    const cart = result.map((item) => {

      return { ...item.productId.toObject(), quantity: item.quantity }

    })

    res.status(200).json({ message: "Item removed from cart", cart });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to remove item from cart" });
  }
});

app.get("/wishlist", verify, async (req, res) => {

  try {

    const user = await User.findById(req.user.id).populate({
      path: "wishList", // Populate the productId field in the cart
      model: "Product", // Replace 'Product' with your actual Product model name
    });

    const wishlist = user.wishList;
    res.status(200).json({ wishlist });

  }
  catch (error) {

    console.error("Error fetching wishlist data:", error);
    res.status(500).json({ message: "Failed to get wishlist", error });

  }
})


app.post('/wishlist', verify, async (req, res) => {
  const { productId } = req.body;

  try {
    // Fetch the user by their ID
    const user = await User.findById(req.user.id);

    // Check if the product ID already exists in the wishlist
    if (user.wishList.includes(productId)) {
      return res.status(400).json({ message: "Product already exists in the wishlist" });
    }

    // Add the product ID to the wishlist
    user.wishList.push(productId);

    // Save the updated user document
    await user.save();

    // Send a success response
    res.status(200).json({ message: "Wishlist updated successfully", wishlist: user.wishList });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update wishlist" });
  }
});

app.delete('/wishlist', verify, async (req, res) => {
  const productId = req.body.productId;
  

  if (!productId) {
    return res.status(400).json({ message: "Product ID is required" });
  }

  try {
    // Fetch the user by their ID and populate the wishlist
    const user = await User.findById(req.user.id).populate({
      path: "wishList",
      model: "Product"
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find the index of the product in the wishlist
    const productIndex = user.wishList.findIndex(
      (product) => product._id.toString() === productId
    );

    if (productIndex === -1) {
      return res.status(400).json({ message: "Product not found in the wishlist" });
    }

    // Remove the product ID from the wishlist
    user.wishList.splice(productIndex, 1);

    // Save the updated user document
    await user.save();

    // Send a success response
    res.status(200).json({
      message: "Product removed from wishlist",
      wishlist: user.wishList
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to remove product from wishlist" });
  }
});

app.get("/user", verify, async (req, res) => {

  const user = req.user;

  const data = await User.findById(user.id)
    .populate({
      path: 'cart.productId', // Populating the 'productId' field inside the cart
      model: 'Product' // The model to use for populating the cart product details
    })
    .populate({
      path: 'wishList', // Populating the 'wishList' field which contains references to Product
      model: 'Product' // The model to use for populating the wishList product details
    })
    .populate({
      path: 'reviews.productId', // Populating the product reference in reviews
      model: 'Product' // The model to populate the product details
    }) .populate({
      path: 'orders', // Populate the orders array
      model: 'Order',
      populate: { // Populate the nested 'products.product' field within each order
        path: 'products.product',
        model: 'Product'
      }
    });

  console.log(user)
  res.json(data)

})
// add new address
app.post("/addresses", verify, async (req, res) => {
  const { street, city, state, postalCode, country } = req.body;

  try {
    const user = await User.findById(req.user.id); // Assuming you're using JWT or session for user authentication
    if (!user) return res.status(404).send("User not found");

    // Create a new address object with the provided fields
    const newAddress = { street, city, state, postalCode, country };
    user.address.push(newAddress);
    await user.save();

    res.status(200).json(newAddress); // Return the newly added address
  } catch (error) {
    console.error("Error adding address:", error);
    res.status(500).send("Server error");
  }
});


app.post("/create-order", async (req, res) => {
  try {
    const { userId,subtotal ,
      shippingCost, products, totalAmount } = req.body; // Get user info and cart data from the frontend

    // Step 1: Create a Razorpay order
    const options = {
      amount: totalAmount * 100, // Razorpay expects the amount in paise (1 INR = 100 paise)
      currency: "INR",
      receipt: `order_rcptid_${new Date().getTime()}`,
    };

    const order = await razorpay.orders.create(options);
    
    if (!order) {
      return res.status(500).send("Error creating Razorpay order");
    }

    // Step 2: Save the order data into the Order schema
    const newOrder = new Order({
      user: userId,
      products: products, // This should be an array of product details (name, price, quantity)
      total: totalAmount,
      subtotal ,
      shippingCost,
      paymentInfo: {
        orderId: order.id,
      },
    });

    await newOrder.save();

    // Step 3: Add the order to the user's orders array
    const user = await User.findById(userId);
    user.orders.push(newOrder._id);
    await user.save();

    // Step 4: Send the order details back to the frontend
    res.json({
      success: true,
      orderId: order.id,
      orderReceipt: order.receipt,
      orderAmount: totalAmount,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error while creating order" });
  }
});


app.post("/verify-payment", async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  try {
    
    const order = await Order.findOne({ "paymentInfo.orderId": razorpayOrderId });
    console.log(razorpayOrderId, "this is order idf")
    if (!order) {
      return res.status(400).send("Order not found");
    }

    // Verify the signature using Razorpay SDK
    const crypto = require("crypto");
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    const generatedSignature = hmac
      .update(razorpayOrderId + "|" + razorpayPaymentId)
      .digest("hex");

    if (generatedSignature !== razorpaySignature) {

      
      return res.status(400).send("Signature mismatch");
    }

    // Update the order with payment details
    order.paymentInfo.paymentId = razorpayPaymentId;
    order.paymentInfo.signature = razorpaySignature;
    order.status = "Paid"; // You can customize the status as per your workflow
    await order.save();

    res.json({ success: true, message: "Payment verified successfully" });
  } catch (error) {

        // Update order status to "Payment Failed" in case of errors
        if (razorpayOrderId) {
          const order = await Order.findOne({ "paymentInfo.orderId": razorpayOrderId });
          if (order) {
            order.status = "Payment Failed";
            await order.save();
          }
        }
    
    console.error("Payment verification failed", error);
    res.status(500).json({ success: false, message: "Payment failed" });
  }
});


// Start the server
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
