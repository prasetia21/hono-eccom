export type RequestBodyType = "none" | "json" | "urlencoded" | "multipart";

export type MemberAuthData = Record<string, unknown>;

export type ContentType = {
  Variables: {
    requestBodyType: RequestBodyType;
    validatedBody: unknown;
    validatedQuery: unknown;
    validatedParams: unknown;
    authData: MemberAuthData;
  };
};
