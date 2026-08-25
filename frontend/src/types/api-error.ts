// Khớp Error Envelope đã thiết kế ở api_design.md mục 0
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details: { field: string; message: string }[] | null;
  };
}