
/*import { createClient } from "@supabase/supabase-js";

export async function POST(request) {
  try {
    const authorization = request.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : null;

    if (!token) {
      return Response.json(
        { error: "Please login first." },
        { status: 401 }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !publishableKey || !serviceKey) {
      return Response.json(
        { error: "Server configuration is incomplete." },
        { status: 500 }
      );
    }

    // Verify customer login
    const authClient = createClient(url, publishableKey);
    const { data: userData, error: authError } =
      await authClient.auth.getUser(token);

    if (authError || !userData.user) {
      return Response.json(
        { error: "Your login session is invalid. Please login again." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { customer_name, phone, address, items } = body;

    if (
      !customer_name?.trim() ||
      !phone?.trim() ||
      !address?.trim() ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return Response.json(
        { error: "Please complete all checkout details." },
        { status: 400 }
      );
    }

    if (
      !/^[0-9]{10}$/.test(phone.trim()) ||
      items.length > 50 ||
      items.some(
        (item) =>
          !Number.isSafeInteger(Number(item.product_id)) ||
          !Number.isSafeInteger(Number(item.quantity)) ||
          Number(item.quantity) < 1 ||
          Number(item.quantity) > 100
      )
    ) {
      return Response.json(
        { error: "Invalid phone number or product quantity." },
        { status: 400 }
      );
    }

    // Secret key is used only on the server
    const adminClient = createClient(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await adminClient.rpc(
      "create_customer_order",
      {
        p_user_id: userData.user.id,
        p_customer_name: customer_name.trim(),
        p_phone: phone.trim(),
        p_address: address.trim(),
        p_items: items.map((item) => ({
          product_id: Number(item.product_id),
          quantity: Number(item.quantity),
        })),
      }
    );

    if (error) {
      console.error("Checkout error:", error.message);

      return Response.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return Response.json(data);
  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "Something went wrong during checkout." },
      { status: 500 }
    );
  }
}*/
import { createClient } from "@supabase/supabase-js";

export async function POST(request) {
  try {
    const authorization = request.headers.get("authorization");

    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : null;

    if (!token) {
      return Response.json(
        { error: "Please login first." },
        { status: 401 }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !publishableKey || !serviceKey) {
      return Response.json(
        { error: "Server configuration is incomplete. Check .env.local." },
        { status: 500 }
      );
    }

    // Verify logged-in customer
    const authClient = createClient(url, publishableKey);

    const { data: userData, error: authError } =
      await authClient.auth.getUser(token);

    if (authError || !userData.user) {
      return Response.json(
        { error: "Login session invalid. Please login again." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const {
      customer_name,
      phone,
      address,
      items
    } = body;

    if (
      !customer_name?.trim() ||
      !phone?.trim() ||
      !address?.trim() ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return Response.json(
        { error: "Please complete all checkout details." },
        { status: 400 }
      );
    }

    if (
      !/^[0-9]{10}$/.test(phone.trim()) ||
      items.length > 50 ||
      items.some(
        (item) =>
          !Number.isSafeInteger(Number(item.product_id)) ||
          !Number.isSafeInteger(Number(item.quantity)) ||
          Number(item.quantity) < 1 ||
          Number(item.quantity) > 100
      )
    ) {
      return Response.json(
        { error: "Invalid phone number or product quantity." },
        { status: 400 }
      );
    }

    // Secure server-side Supabase client
    const adminClient = createClient(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    // Create order using database function
    const { data, error } = await adminClient.rpc(
      "create_customer_order",
      {
        p_user_id: userData.user.id,
        p_customer_name: customer_name.trim(),
        p_phone: phone.trim(),
        p_address: address.trim(),
        p_items: items.map((item) => ({
          product_id: Number(item.product_id),
          quantity: Number(item.quantity)
        }))
      }
    );

    if (error) {
      console.error("Checkout error:", error.message);

      return Response.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return Response.json(data);

  } catch (error) {
    console.error("Server error:", error);

    return Response.json(
      { error: "Something went wrong during checkout." },
      { status: 500 }
    );
  }
}