export interface PaginatedResponse<T> {
  current_page: number;
  data: T[];
  first_page_url: string;
  from: number;
  last_page: number;
  last_page_url: string;
  links: Array<{
    url: string | null;
    label: string;
    active: boolean;
  }>;
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number;
  total: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export function calculatePaginationOffset(params: PaginationParams): number {
  return (params.page - 1) * params.limit;
}

function buildPageUrl(baseUrl: string, page: number, limit: number): string {
  const url = new URL(baseUrl);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(limit));
  return url.toString();
}

function buildPaginationLinks(
  currentPage: number,
  lastPage: number,
  baseUrl: string,
  limit: number,
): PaginatedResponse<unknown>["links"] {
  const links: PaginatedResponse<unknown>["links"] = [];

  // Previous
  links.push({
    url: currentPage > 1 ? buildPageUrl(baseUrl, currentPage - 1, limit) : null,
    label: "&laquo; Previous",
    active: false,
  });

  const windowStart = Math.max(1, currentPage - 3);
  const windowEnd = Math.min(lastPage, currentPage + 3);

  if (windowStart > 1) {
    links.push({ url: buildPageUrl(baseUrl, 1, limit), label: "1", active: false });
    if (windowStart > 2) {
      links.push({ url: null, label: "...", active: false });
    }
  }

  for (let i = windowStart; i <= windowEnd; i++) {
    links.push({
      url: buildPageUrl(baseUrl, i, limit),
      label: String(i),
      active: i === currentPage,
    });
  }

  if (windowEnd < lastPage) {
    if (windowEnd < lastPage - 1) {
      links.push({ url: null, label: "...", active: false });
    }
    links.push({
      url: buildPageUrl(baseUrl, lastPage, limit),
      label: String(lastPage),
      active: false,
    });
  }

  // Next
  links.push({
    url: currentPage < lastPage ? buildPageUrl(baseUrl, currentPage + 1, limit) : null,
    label: "Next &raquo;",
    active: false,
  });

  return links;
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  fullUrl: string,
  path?: string,
): PaginatedResponse<T> {
  const lastPage = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.max(1, Math.min(page, lastPage));
  const from = total === 0 ? 0 : (currentPage - 1) * limit + 1;
  const to = total === 0 ? 0 : Math.min(currentPage * limit, total);

  const baseUrl = new URL(fullUrl);
  baseUrl.searchParams.delete("page");
  baseUrl.searchParams.delete("limit");
  const base = path ?? baseUrl.toString();

  return {
    current_page: currentPage,
    data,
    first_page_url: buildPageUrl(base, 1, limit),
    from,
    last_page: lastPage,
    last_page_url: buildPageUrl(base, lastPage, limit),
    links: buildPaginationLinks(currentPage, lastPage, base, limit),
    next_page_url: currentPage < lastPage ? buildPageUrl(base, currentPage + 1, limit) : null,
    path: path ?? `${baseUrl.origin}${baseUrl.pathname}`,
    per_page: limit,
    prev_page_url: currentPage > 1 ? buildPageUrl(base, currentPage - 1, limit) : null,
    to,
    total,
  };
}
