
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const router = useRouter();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [message, setMessage] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  async function loadOrders(token) {
  try {
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/admin/orders", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Unable to load orders");
    }

    setOrders(result.orders || []);
  } catch (error) {
    console.error("Load Orders Error:", error);
    setMessage(error.message);
  } finally {
    setLoading(false);
  }
}
  useEffect(() => {
    let mounted = true;

    async function startDashboard() {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!mounted) return;

      if (!session) {
        router.replace("/login");
        return;
      }

      setAdminEmail(session.user.email);
      await loadOrders(session.access_token);
    }

    startDashboard();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function updateStatus(orderId, status) {
    try {
      setUpdating(orderId);
      setMessage("");

      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.replace("/login");
        return;
      }

      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({
          order_id: orderId,
          status,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Status update failed");
      }

      setOrders((previous) =>
        previous.map((order) =>
          order.id === orderId
            ? { ...order, status: result.order.status }
            : order
        )
      );

      setMessage("Order status updated successfully!");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setUpdating(null);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const totalOrders = orders.length;

  const totalSales = orders
    .filter((order) => order.status !== "Cancelled")
    .reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

  const pendingOrders = orders.filter(
    (order) => order.status === "Pending"
  ).length;

  const deliveredOrders = orders.filter(
    (order) => order.status === "Delivered"
  ).length;

  const money = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  if (loading) {
    return <div className="loading">Loading Admin Dashboard...</div>;
  }

  return (
    <main className="dashboard">
      <aside className="sidebar">
        <div className="brand">
          <span>Sleepwell</span>
          <small>ADMIN PANEL</small>
        </div>

        <nav>
          <a className="active" href="/admin">▦ Dashboard</a>
          <a href="#orders">▤ Orders</a>
          <a href="#customers">♙ Customers</a>
        </nav>

        <button className="logout" onClick={logout}>
          ↪ Logout
        </button>
      </aside>

      <section className="main">
        <header className="topbar">
          <div>
            <h1>Dashboard</h1>
            <p>Welcome to Sleepwell Admin Panel</p>
          </div>

          <div className="profile">
            <div className="avatar">A</div>
            <div>
              <strong>Administrator</strong>
              <small>{adminEmail}</small>
            </div>
          </div>
        </header>

        {message && <div className="notice">{message}</div>}

        <div className="stats">
          <div className="stat-card">
            <span>Total Orders</span>
            <h2>{totalOrders}</h2>
            <small>All customer orders</small>
          </div>

          <div className="stat-card">
            <span>Total Sales</span>
            <h2>{money(totalSales)}</h2>
            <small>Excluding cancelled orders</small>
          </div>

          <div className="stat-card">
            <span>Pending Orders</span>
            <h2>{pendingOrders}</h2>
            <small>Orders awaiting processing</small>
          </div>

          <div className="stat-card">
            <span>Delivered Orders</span>
            <h2>{deliveredOrders}</h2>
            <small>Successfully delivered</small>
          </div>
        </div>

        <section className="orders-section" id="orders">
          <div className="section-heading">
            <div>
              <h2>Recent Orders</h2>
              <p>Manage your customer orders</p>
            </div>

           <button
  className="refresh"
  onClick={async () => {
    try {
      setLoading(true);
      setMessage("");

      const { data, error } = await supabase.auth.getSession();

      if (error) throw error;

      if (!data.session) {
        setMessage("Please login again.");
        return;
      }

      await loadOrders(data.session.access_token);

    } catch (error) {
      console.error("Refresh error:", error);
      setMessage(error.message || "Refresh failed.");
    } finally {
      setLoading(false);
    }
  }}
  disabled={loading}
>
  {loading ? "Refreshing..." : "↻ Refresh"}
</button>
          </div>

          {orders.length === 0 ? (
            <div className="empty">
              <h3>No Orders Yet</h3>
              <p>Customer orders will appear here.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Products</th>
                    <th>Total</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Update</th>
                  </tr>
                </thead>

                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>#{order.id}</td>

                      <td>
                        <strong>{order.customer_name}</strong>
                        <small>{order.phone}</small>
                        <small>{order.address}</small>
                      </td>

                      <td>
                        {order.order_items?.map((item) => (
                          <div key={item.id} className="product">
                            {item.product_name} × {item.quantity}
                          </div>
                        ))}
                      </td>

                      <td className="amount">
                        {money(order.total_amount)}
                      </td>

                      <td>
                        {new Date(order.created_at).toLocaleDateString("en-IN")}
                      </td>

                      <td>
                        <span className={`status ${order.status?.toLowerCase()}`}>
                          {order.status}
                        </span>
                      </td>

                      <td>
                        <select
                          value={order.status}
                          disabled={updating === order.id}
                          onChange={(e) =>
                            updateStatus(order.id, e.target.value)
                          }
                        >
                          <option value="Pending">Pending</option>
                          <option value="Processing">Processing</option>
                          <option value="Shipped">Shipped</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                        {updating === order.id && <small>Updating...</small>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer>
          © 2026 Sleepwell Mattress | Admin Dashboard
        </footer>
      </section>

      <style jsx>{`
        * { box-sizing: border-box; }

        .dashboard {
          min-height: 100vh;
          display: flex;
          background: #f4f6fa;
          color: #243047;
          font-family: Arial, sans-serif;
        }

        .sidebar {
          width: 245px;
          background: #172d4b;
          color: white;
          padding: 30px 20px;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
        }

        .brand {
          font-size: 26px;
          font-weight: bold;
          margin-bottom: 55px;
        }

        .brand small {
          display: block;
          font-size: 10px;
          letter-spacing: 3px;
          color: #a9bdd8;
          margin-top: 7px;
        }

        nav { display: grid; gap: 12px; }

        nav a {
          padding: 14px;
          color: #d7e1ee;
          text-decoration: none;
          border-radius: 8px;
        }

        nav a.active, nav a:hover {
          background: #31547e;
          color: white;
        }

        .logout {
          margin-top: auto;
          padding: 13px;
          border: 1px solid #7890ac;
          background: transparent;
          color: white;
          border-radius: 8px;
          cursor: pointer;
        }

        .main {
          flex: 1;
          min-width: 0;
          padding: 32px;
        }

        .topbar, .section-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          flex-wrap: wrap;
        }

        h1 { font-size: 30px; margin: 0 0 8px; }
        h2 { margin: 0 0 8px; }
        p { color: #778398; margin: 0; }

        .profile {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .profile small, td small {
          display: block;
          color: #8591a2;
          margin-top: 5px;
          overflow-wrap: anywhere;
        }

        .avatar {
          background: #e3ebf7;
          color: #23446e;
          border-radius: 50%;
          padding: 13px 17px;
          font-weight: bold;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
          margin: 35px 0;
        }

        .stat-card {
          background: white;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 3px 15px #1b34500b;
        }

        .stat-card span { color: #78869a; }
        .stat-card h2 { font-size: 27px; margin: 17px 0 8px; }
        .stat-card small { color: #8995a5; }

        .orders-section {
          background: white;
          padding: 25px;
          border-radius: 12px;
          box-shadow: 0 3px 15px #1b34500b;
        }

        .refresh {
          padding: 10px 17px;
          border: 0;
          border-radius: 7px;
          background: #172d4b;
          color: white;
          cursor: pointer;
        }

        .table-wrap { overflow-x: auto; margin-top: 25px; }

        table {
          width: 100%;
          min-width: 900px;
          border-collapse: collapse;
          text-align: left;
        }

        th {
          color: #748198;
          background: #f6f8fb;
          padding: 15px 12px;
          font-size: 13px;
        }

        td {
          padding: 17px 12px;
          border-bottom: 1px solid #edf0f4;
          font-size: 13px;
          vertical-align: top;
        }

        .product { margin-bottom: 6px; }

        .amount { font-weight: bold; color: #172d4b; }

        .status {
          display: inline-block;
          padding: 7px 10px;
          border-radius: 20px;
          background: #edf1f7;
          color: #45566d;
          white-space: nowrap;
        }

        .status.delivered { background: #e3f7eb; color: #18834b; }
        .status.cancelled { background: #ffebeb; color: #c33b3b; }
        .status.pending { background: #fff3d9; color: #a36c0c; }
        .status.shipped { background: #e5efff; color: #2863ad; }
        .status.processing { background: #eee8ff; color: #6844ad; }

        select {
          padding: 9px;
          border: 1px solid #dce2eb;
          border-radius: 6px;
          background: white;
          max-width: 125px;
        }

        .empty {
          text-align: center;
          padding: 55px 10px;
        }

        .empty h3 { margin-bottom: 10px; }

        .notice {
          background: #e8f2ff;
          padding: 13px;
          border-radius: 8px;
          margin-top: 20px;
          color: #244d7a;
        }

        footer {
          text-align: center;
          color: #8995a5;
          padding: 30px 10px;
          font-size: 13px;
        }

        .loading {
          padding: 60px;
          text-align: center;
          font-family: Arial, sans-serif;
        }

        @media(max-width: 1000px) {
          .stats { grid-template-columns: repeat(2, 1fr); }
        }

        @media(max-width: 650px) {
          .dashboard { display: block; }
          .sidebar { width: 100%; padding: 18px; }
          .brand { margin-bottom: 20px; }
          nav { grid-template-columns: repeat(3, 1fr); }
          nav a { font-size: 12px; padding: 10px 5px; }
          .logout { margin-top: 15px; }
          .main { padding: 18px 12px; }
          .stats { grid-template-columns: 1fr 1fr; gap: 10px; }
          .stat-card { padding: 15px; }
          .stat-card h2 { font-size: 20px; }
          .orders-section { padding: 15px; }
        }
      `}</style>
    </main>
  );
}
