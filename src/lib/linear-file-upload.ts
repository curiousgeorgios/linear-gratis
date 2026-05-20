import { validateFormAttachmentFile } from '@/lib/form-attachment'

const LINEAR_API_URL = 'https://api.linear.app/graphql'

type LinearFileUploadPayload = {
  success: boolean
  uploadFile?: {
    uploadUrl: string
    assetUrl: string
    headers: Array<{ key: string; value: string }>
  } | null
}

type LinearFileUploadResponse = {
  data?: {
    fileUpload?: LinearFileUploadPayload
  }
  errors?: Array<{ message: string }>
}

export async function uploadFileToLinear(
  apiToken: string,
  file: File,
): Promise<
  | { success: true; assetUrl: string }
  | { success: false; error: string }
> {
  const validation = validateFormAttachmentFile(file)
  if (!validation.ok) return { success: false, error: validation.error }

  const mutation = `
    mutation FileUpload($contentType: String!, $filename: String!, $size: Int!) {
      fileUpload(contentType: $contentType, filename: $filename, size: $size) {
        success
        uploadFile {
          uploadUrl
          assetUrl
          headers {
            key
            value
          }
        }
      }
    }
  `

  const uploadRequest = await fetch(LINEAR_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiToken.trim(),
    },
    body: JSON.stringify({
      query: mutation,
      variables: {
        contentType: file.type,
        filename: file.name,
        size: file.size,
      },
    }),
  })

  if (!uploadRequest.ok) {
    return {
      success: false,
      error: `Linear upload request failed: ${uploadRequest.status} ${uploadRequest.statusText}`,
    }
  }

  const result = (await uploadRequest.json()) as LinearFileUploadResponse
  if (result.errors?.length) {
    return {
      success: false,
      error: `Linear upload request failed: ${result.errors.map((e) => e.message).join(', ')}`,
    }
  }

  const uploadFile = result.data?.fileUpload?.uploadFile
  if (!result.data?.fileUpload?.success || !uploadFile) {
    return { success: false, error: 'Linear did not return an upload URL.' }
  }

  const headers = new Headers()
  headers.set('Content-Type', file.type)
  headers.set('Cache-Control', 'public, max-age=31536000')
  uploadFile.headers.forEach(({ key, value }) => headers.set(key, value))

  const uploadResponse = await fetch(uploadFile.uploadUrl, {
    method: 'PUT',
    headers,
    body: file,
  })

  if (!uploadResponse.ok) {
    return {
      success: false,
      error: `Linear file upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`,
    }
  }

  return { success: true, assetUrl: uploadFile.assetUrl }
}
