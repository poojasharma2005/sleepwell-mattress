
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const categories = [
  {
    name: "Memory Foam",
    image:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600",
  },
  {
    name: "Luxury Mattress",
    image:
      "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600",
  },
  {
    name: "Orthopedic",
    image:
      "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=600",
  },
];

export default function Home() {
  const router = useRouter();

  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [message, setMessage] = useState("");
  const [user, setUser] = useState(null);

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [orderSuccess, setOrderSuccess] = useState(null);

  // Load products, cart and user
  useEffect(() => {
    async function initialize() {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error.message);
        setMessage("Unable to load products.");
      } else {
        setProducts(data || []);
      }

      const { data: userData } = await supabase.auth.getUser();
      setUser(userData.user);

      try {
        const savedCart = localStorage.getItem("sleepwell-cart");

        if (savedCart) {
          setCart(JSON.parse(savedCart));
        }
      } catch (error) {
        console.error("Cart loading error:", error);
      }

      setLoading(false);
    }

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Save cart
  useEffect(() => {
    localStorage.setItem("sleepwell-cart", JSON.stringify(cart));
  }, [cart]);

  // Message
  function showMessage(text) {
    setMessage(text);

    setTimeout(() => {
      setMessage("");
    }, 3000);
  }

  // Price format
  function formatPrice(price) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);
  }

  // Add to cart
  function addToCart(product) {
    if (product.stock <= 0) {
      showMessage("Sorry! Product is out of stock.");
      return;
    }

    const existing = cart.find((item) => item.id === product.id);

    if (existing && existing.quantity >= product.stock) {
      showMessage("Maximum stock limit reached!");
      return;
    }

    setCart((oldCart) => {
      const existingItem = oldCart.find(
        (item) => item.id === product.id
      );

      if (existingItem) {
        return oldCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...oldCart, { ...product, quantity: 1 }];
    });

    showMessage(`${product.name} added to cart successfully!`);
  }

  // Change quantity
  function changeQuantity(id, amount) {
    setCart((oldCart) =>
      oldCart
        .map((item) => {
          if (item.id === id) {
            const newQuantity = item.quantity + amount;

            if (newQuantity > item.stock) {
              return item;
            }

            return { ...item, quantity: newQuantity };
          }

          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  }

  // Remove product
  function removeFromCart(id) {
    setCart((oldCart) =>
      oldCart.filter((item) => item.id !== id)
    );

    showMessage("Product removed from cart.");
  }

  // Logout
  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      showMessage(error.message);
    } else {
      setUser(null);
      showMessage("Logged out successfully!");
    }
  }

  // Checkout
  async function handleCheckout(e) {
    e.preventDefault();

    if (!user) {
      router.push("/login");
      return;
    }

    if (cart.length === 0) {
      showMessage("Your cart is empty.");
      return;
    }

    if (!/^[0-9]{10}$/.test(phone.trim())) {
      showMessage("Enter a valid 10 digit mobile number.");
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Please login again.");
      }

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          customer_name: customerName.trim(),
          phone: phone.trim(),
          address: address.trim(),
          items: cart.map((item) => ({
            product_id: item.id,
            quantity: item.quantity,
          })),
        }),
      });

     
const responseText = await response.text();

let result;

try {
  result = JSON.parse(responseText);
} catch (error) {
  console.error("Invalid JSON response:", responseText);

  throw new Error(
    `Server response error (${response.status}). Check terminal for details.`
  );
}

if (!response.ok) {
  throw new Error(result.error || "Checkout failed.");
}


      setOrderSuccess({
        id: result.order_id,
        total: result.total_amount,
      });

      setCart([]);
      setCheckoutOpen(false);
      setCustomerName("");
      setPhone("");
      setAddress("");

      showMessage("Your order has been placed successfully!");

      // Refresh products and stock
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setProducts(data);
      }
    } catch (error) {
      showMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  const totalItems = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const totalPrice = cart.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );

  return (
    <main>
      {/* TOP BAR */}
      <div className="top-bar">
        Free Delivery | Extra 10% OFF on Your First Order
      </div>

      {/* MESSAGE */}
      {message && (
        <div className="cart-message">✓ {message}</div>
      )}

      {/* NAVBAR */}
      <nav className="navbar">
        <a href="#" className="logo">
          SLEEPWELL<span>.</span>
        </a>

        <div className="nav-links">
          <a href="#">Home</a>
          <a href="#categories">Categories</a>
          <a href="#products">Shop</a>
          <a href="#about">About Us</a>
          <a href="#contact">Contact</a>
        </div>

        <div className="nav-actions">
          {user ? (
            <>
              <span className="welcome-user">
                Hi, {user.user_metadata?.full_name || user.email}
              </span>

              <button
                onClick={handleLogout}
                className="nav-btn"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <a href="/login" className="nav-btn">
                Login
              </a>

              <a href="/signup" className="nav-btn">
                Sign Up
              </a>
            </>
          )}

          <button
            className="nav-btn"
            onClick={() => setCartOpen(!cartOpen)}
          >
            🛒 Cart ({totalItems})
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-content">
          <span className="small-title">
            THE ART OF BETTER SLEEP
          </span>

          <h1>
            Sleep Better.
            <br />
            Live <span>Happier.</span>
          </h1>

          <p>
            Experience luxurious comfort with our premium
            mattresses, designed to make every night peaceful
            and refreshing.
          </p>

          <a href="#products" className="primary-btn">
            Explore Collection →
          </a>

          <div className="hero-note">
            ✓ Premium Quality &nbsp; ✓ Ultimate Comfort
          </div>
        </div>

        <div className="hero-photo">
          <div className="photo-label">
            <strong>Wake Up Refreshed</strong>
            <p>Comfort made for you.</p>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features">
        <div>
          ☁️ <strong>Cloud-like Comfort</strong>
          <small>Relax every night</small>
        </div>

        <div>
          🚚 <strong>Free Delivery</strong>
          <small>At your doorstep</small>
        </div>

        <div>
          ✦ <strong>Premium Quality</strong>
          <small>Made for better sleep</small>
        </div>

        <div>
          ↻ <strong>Easy Returns</strong>
          <small>Shop with confidence</small>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="section" id="categories">
        <div className="section-heading">
          <span className="small-title">
            EXPLORE OUR COLLECTION
          </span>

          <h2>Shop By Category</h2>

          <p>Find the perfect comfort for your lifestyle.</p>
        </div>

        <div className="category-grid">
          {categories.map((item) => (
            <a
              href="#products"
              className="category-card"
              key={item.name}
            >
              <img src={item.image} alt={item.name} />

              <div className="category-overlay">
                <h3>{item.name}</h3>
                <span>Explore Collection →</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* PRODUCTS */}
      <section
        className="section product-section"
        id="products"
      >
        <div className="section-heading">
          <span className="small-title">
            CUSTOMER FAVOURITES
          </span>

          <h2>Our Best Selling Mattresses</h2>

          <p>Discover comfort that makes a difference.</p>
        </div>

        {loading ? (
          <p>Loading mattresses...</p>
        ) : products.length === 0 ? (
          <p>No products available right now.</p>
        ) : (
          <div className="product-grid">
            {products.map((item) => (
              <article className="product-card" key={item.id}>
                <div className="product-image">
                  <img src={item.image_url} alt={item.name} />
                  <span className="sale-tag">BEST SELLER</span>
                </div>

                <div className="product-info">
                  <span className="rating">★★★★★</span>

                  <h3>{item.name}</h3>

                  <p className="price">
                    {formatPrice(item.price)}
                  </p>

                  <p>
                    {item.stock > 0
                      ? "In Stock"
                      : "Out of Stock"}
                  </p>

                  <button
                    className="cart-btn"
                    onClick={() => addToCart(item)}
                    disabled={item.stock <= 0}
                  >
                    Add To Cart
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* CART AND CHECKOUT */}
      {cartOpen && (
        <section className="section cart-section">
          <div className="cart-heading">
            <h2>My Shopping Cart 🛒</h2>

            <button
              className="close-cart"
              onClick={() => setCartOpen(false)}
            >
              ✕
            </button>
          </div>

          {cart.length === 0 ? (
            <p>Your cart is empty. Start shopping!</p>
          ) : (
            <>
              {cart.map((item) => (
                <div className="cart-item" key={item.id}>
                  <img
                    src={item.image_url}
                    alt={item.name}
                  />

                  <div className="cart-item-info">
                    <h3>{item.name}</h3>

                    <p>{formatPrice(item.price)}</p>

                    <div className="quantity-control">
                      <button
                        onClick={() =>
                          changeQuantity(item.id, -1)
                        }
                      >
                        −
                      </button>

                      <span>{item.quantity}</span>

                      <button
                        onClick={() =>
                          changeQuantity(item.id, 1)
                        }
                        disabled={item.quantity >= item.stock}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    className="remove-btn"
                    onClick={() => removeFromCart(item.id)}
                  >
                    Remove
                  </button>
                </div>
              ))}

              <div className="cart-total">
                <h3>Total: {formatPrice(totalPrice)}</h3>

                <button
                  className="checkout-btn"
                  onClick={() => {
                    if (!user) {
                      showMessage("Please login before checkout.");
                      router.push("/login");
                    } else {
                      setCheckoutOpen(true);
                    }
                  }}
                >
                  Proceed to Checkout
                </button>
              </div>
            </>
          )}

          {/* CHECKOUT FORM */}
          {checkoutOpen && (
            <div className="checkout-form">
              <h2>Delivery Details</h2>

              <form onSubmit={handleCheckout}>
                <label>Full Name</label>

                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={customerName}
                  onChange={(e) =>
                    setCustomerName(e.target.value)
                  }
                  required
                />

                <label>Mobile Number</label>

                <input
                  type="tel"
                  placeholder="10 digit mobile number"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value)
                  }
                  pattern="[0-9]{10}"
                  maxLength={10}
                  required
                />

                <label>Delivery Address</label>

                <textarea
                  placeholder="Enter complete delivery address"
                  value={address}
                  onChange={(e) =>
                    setAddress(e.target.value)
                  }
                  required
                />

                <div className="checkout-summary">
                  <h3>Order Summary</h3>
                  <p>Total Items: {totalItems}</p>
                  <h3>Total: {formatPrice(totalPrice)}</h3>
                  <p>Payment Method: Cash on Delivery</p>
                </div>

                <button
                  type="submit"
                  className="checkout-btn"
                  disabled={submitting}
                >
                  {submitting
                    ? "Placing Order..."
                    : "Confirm Order"}
                </button>

                <button
                  type="button"
                  className="cancel-checkout"
                  onClick={() => setCheckoutOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
              </form>
            </div>
          )}
        </section>
      )}

      {/* ORDER SUCCESS */}
      {orderSuccess && (
        <div className="order-success">
          <h2>🎉 Order Successful!</h2>

          <p>
            Your Order ID: #{orderSuccess.id}
          </p>

          <h3>
            Total: {formatPrice(orderSuccess.total)}
          </h3>

          <p>
            Thank you for shopping with Sleepwell.
          </p>

          <button
            onClick={() => {
              setOrderSuccess(null);
              setCartOpen(false);
            }}
          >
            Continue Shopping
          </button>
        </div>
      )}

      {/* OFFER */}
      <section className="offer-banner">
        <div>
          <span className="small-title">
            SPECIAL SLEEPWELL OFFER
          </span>

          <h2>Make Your Sleep More Luxurious.</h2>

          <p>Discover your perfect mattress today.</p>

          <a href="#products" className="light-btn">
            Shop Collection →
          </a>
        </div>
      </section>

      {/* ABOUT */}
      <section className="about-section" id="about">
        <div className="about-image">
          <img
            src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1000"
            alt="Beautiful bedroom interior"
          />
        </div>

        <div className="about-content">
          <span className="small-title">ABOUT SLEEPWELL</span>

          <h2>
            Every Great Day Begins With A Good Night.
          </h2>

          <p>
            We believe sleep is an essential part of a happy life.
            Our collection brings together comfort, thoughtful
            design and quality to help you enjoy peaceful nights.
          </p>

          <a href="#contact" className="primary-btn">
            Discover More →
          </a>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="benefits section">
        <div className="section-heading">
          <span className="small-title">
            THE SLEEPWELL DIFFERENCE
          </span>

          <h2>Why Choose Us?</h2>
        </div>

        <div className="benefit-grid">
          <div>
            <span>☁️</span>
            <h3>Superior Comfort</h3>
            <p>Comfort designed for relaxing nights.</p>
          </div>

          <div>
            <span>✦</span>
            <h3>Premium Materials</h3>
            <p>Thoughtful materials and quality.</p>
          </div>

          <div>
            <span>♡</span>
            <h3>Made For You</h3>
            <p>Options for different sleep needs.</p>
          </div>

          <div>
            <span>✓</span>
            <h3>Trusted Service</h3>
            <p>Support throughout your journey.</p>
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="testimonial">
        <span className="small-title">HAPPY SLEEPERS</span>

        <h2>Comfort That Speaks For Itself.</h2>

        <div className="review">
          <div className="rating">★★★★★</div>

          <p>
            "A beautiful and comfortable sleep experience.
            I love the quality and design."
          </p>

          <strong>— Happy Customer</strong>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="newsletter">
        <h2>Get Better Sleep In Your Inbox.</h2>

        <p>
          Discover new collections, offers and sleep inspiration.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            showMessage("Thank you for subscribing!");
          }}
        >
          <input
            type="email"
            placeholder="Enter your email address"
            required
          />

          <button type="submit">Subscribe</button>
        </form>
      </section>

      {/* FOOTER */}
      <footer id="contact">
        <div className="footer-grid">
          <div>
            <a href="#" className="logo footer-logo">
              SLEEPWELL<span>.</span>
            </a>

            <p>Comfort, quality and peaceful nights.</p>
          </div>

          <div>
            <h3>Quick Links</h3>
            <a href="#">Home</a>
            <a href="#products">Shop</a>
            <a href="#about">About</a>
          </div>

          <div>
            <h3>Collections</h3>
            <a href="#categories">Memory Foam</a>
            <a href="#categories">Luxury</a>
            <a href="#categories">Orthopedic</a>
          </div>

          <div>
            <h3>Contact Us</h3>
            <p>Email: hello@example.com</p>
            <p>Phone: +91 00000 00000</p>
          </div>
        </div>

        <div className="copyright">
          © 2026 Sleepwell. All Rights Reserved.
        </div>
      </footer>
    </main>
  );
}
