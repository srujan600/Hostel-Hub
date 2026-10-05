import { ApiResponse } from "@/types";

class ApiClient {
  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("hostelhub_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  async get<T>(url: string): Promise<ApiResponse<T>> {
    const response = await fetch(url, {
      method: "GET",
      headers: this.getHeaders(),
    });
    return this.handleResponse<T>(response);
  }

  async post<T>(url: string, body?: any): Promise<ApiResponse<T>> {
    const response = await fetch(url, {
      method: "POST",
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  async put<T>(url: string, body?: any): Promise<ApiResponse<T>> {
    const response = await fetch(url, {
      method: "PUT",
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  async patch<T>(url: string, body?: any): Promise<ApiResponse<T>> {
    const response = await fetch(url, {
      method: "PATCH",
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  async delete<T>(url: string): Promise<ApiResponse<T>> {
    const response = await fetch(url, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    return this.handleResponse<T>(response);
  }

  private async handleResponse<T>(res: Response): Promise<ApiResponse<T>> {
    const contentType = res.headers.get("content-type");
    let json: any;
    if (contentType && contentType.includes("application/json")) {
      json = await res.json();
    } else {
      json = { success: res.ok, data: null };
    }

    if (!res.ok) {
      if (res.status === 401 && typeof window !== "undefined") {
        localStorage.removeItem("hostelhub_token");
      }
      throw new Error(json.error?.message || `HTTP ${res.status}: ${res.statusText}`);
    }

    return json;
  }
}

export const api = new ApiClient();
