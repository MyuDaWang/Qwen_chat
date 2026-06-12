import { apiError } from "@/src/shared/apiResponse";
import { isAuthRequiredError } from "@/src/server/users";

export function authErrorResponse(error: unknown) {
  if (!isAuthRequiredError(error)) return null;
  return apiError("UNAUTHORIZED", error.message, 401);
}
