import 'server-only'
import { db } from '@/lib/db'

export async function getOrganizerApplication(userId: string) {
  return db.organizerApplication.findUnique({
    where: { userId },
    select: {
      id: true,
      organizerName: true,
      bio: true,
      idType: true,
      instagramUrl: true,
      twitterUrl: true,
      facebookUrl: true,
      websiteUrl: true,
      kycStatus: true,
      reviewNote: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}
