
import { createClient } from "@supabase/supabase-js";

async function verifyAdmin(request) {
  const authorization = request.headers.get("authorization");

  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;

  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!url || !publishableKey || !serviceKey || !adminEmail) {
    throw new Error("Admin configuration is incomplete.");
  }

  // Verify logged-in user
  const authClient = createClient(url, publishableKey);

  const { data, error } = await authClient.auth.getUser(token);

  if (
    error ||
    !data.user ||
    data.user.email?.toLowerCase() !== adminEmail.toLowerCase()
  ) {
    return null;
  }

  // Server-side admin client
  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// GET: Fetch all orders
export async function GET(request) {
  try {
    const admin = await verifyAdmin(request);

    if (!admin) {
      return Response.json(
        { error: "Admin access denied." },
        { status: 403 }
      );
    }

    const { data, error } = await admin
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return Response.json({
      success: true,
      orders: data,
    });
  } catch (error) {
    console.error("Admin GET error:", error);

    return Response.json(
      { error: error.message || "Unable to fetch orders." },
      { status: 500 }
    );
  }
}

// PATCH: Update order status
export async function PATCH(request) {
  try {
    const admin = await verifyAdmin(request);

    if (!admin) {
      return Response.json(
        { error: "Admin access denied." },
        { status: 403 }
      );
    }

    const { order_id, status } = await request.json();

    const allowedStatuses = [
      "Pending",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
    ];

    if (!order_id || !allowedStatuses.includes(status)) {
      return Response.json(
        { error: "Invalid order or status." },
        { status: 400 }
      );
    }

    const { data, error } = await admin
      .from("orders")
      .update({ status })
      .eq("id", order_id)
      .select()
      .single();

    if (error) throw error;

    return Response.json({
      success: true,
      message: "Order status updated successfully.",
      order: data,
    });
  } catch (error) {
    console.error("Admin PATCH error:", error);

    return Response.json(
      { error: error.message || "Unable to update order." },
      { status: 500 }
    );
  }
}
