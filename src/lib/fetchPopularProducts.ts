
export async function fetchPopularProducts(limit = 10, days = 14) {
    const url = `https://ostersifshop.se/export/popular/data.json?limit=${limit}&days=${days}`;

    // Add timeout to prevent hanging during build
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      const res = await fetch(url, {
        next: { revalidate: 21600 },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) throw new Error("Failed to fetch popular products");

      return await res.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        console.error("Timeout fetching popular products");
      } else {
        console.error("Error fetching popular products:", error);
      }
      return [];
    }
  }
  