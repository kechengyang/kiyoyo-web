export const FAVORITE_OWNER_KEY = "kiyoyo-saved-owner";
export const GUEST_FAVORITE_OWNER = "guest";

export const memberFavoriteOwner = (memberId: string) =>
  `member:${memberId}`;

export function planFavoriteSync(input: {
  owner: string | null;
  memberId: string;
  localIds: string[];
}) {
  const targetOwner = memberFavoriteOwner(input.memberId);
  const guestOwned = input.owner === GUEST_FAVORITE_OWNER;
  return {
    targetOwner,
    resetLocal: !guestOwned && input.owner !== targetOwner,
    uploadIds: guestOwned ? [...input.localIds] : [],
  };
}

export const shouldClearFavoritesOnSignOut = (owner: string | null) =>
  Boolean(owner?.startsWith("member:"));
