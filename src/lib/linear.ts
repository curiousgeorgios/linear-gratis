/**
 * Linear Customer Request Manager
 *
 * A simple wrapper around the Linear API that creates customer requests
 * using the official Linear SDK on the server-side.
 */
export class LinearCustomerRequestManager {
  private apiToken: string;

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  /**
   * Creates a customer request in Linear
   *
   * @param customerData - Customer information (name, email, etc.)
   * @param requestData - Request details (title, body, attachments)
   * @param projectId - Linear project ID to create the request in
   * @returns Promise with success status and request/customer data
   */
  async createRequestWithCustomer(
    customerData: {
      name: string;
      email: string;
      externalId?: string;
      avatarUrl?: string;
    },
    requestData: {
      title: string;
      body: string;
      attachmentUrl?: string;
      attachmentId?: string;
      commentId?: string;
    },
    projectId: string
  ) {
    try {
      const response = await fetch('/api/linear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiToken: this.apiToken,
          customerData,
          requestData,
          projectId
        })
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || `HTTP Error: ${response.status}`);
      }

      const data = await response.json() as {
        success: boolean
        customer?: { id: string }
        request?: { id: string }
        error?: string
      };
      return data;

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}