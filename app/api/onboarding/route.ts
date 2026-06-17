import { ensureUserOnboarded, getAuthenticatedUser } from "@/lib/auth/helpers";
import { apiError, apiSuccess } from "@/lib/api/response";
import { onboardingSchema } from "@/lib/validations/schemas";

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return apiError("Unauthorized", 401);
    }

    const body = await request.json();
    const parsed = onboardingSchema.parse(body);

    const shop = await ensureUserOnboarded(
      auth.user.id,
      auth.user.phone,
      parsed.shopName
    );

    return apiSuccess({ shop });
  } catch {
    return apiError("Failed to onboard", 500);
  }
}
