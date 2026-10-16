// mock data wait for axios - switch later

export type MockData = {
  users: {
    id: string
    name: string
    role: string
    initials: string
    avatarSrc: string
  }[]
  horses: {
    id: string
    name: string
    breed: string
    status: string
    ownerId: string
  }[]
  transportRequests: {
    id: string
    horseId: string
    origin: string
    destination: string
    status: string
    requestedAt: string
  }[]
}

export async function fetchMockData(): Promise<MockData> {
  const response = await fetch("/db.json")

  if (!response.ok) {
    throw new Error(`Failed to load mock data: ${response.status}`)
  }

  return response.json() as Promise<MockData>
}
