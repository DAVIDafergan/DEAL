/**
 * Media שנוצר ע"י AI (Runway/Mubert) צריך מקום קבוע — לא להיווצר מחדש בכל בקשה. בלי
 * AWS_S3_BUCKET/CLOUDINARY_URL מוגדר, פשוט מחזירים את ה-URL המקורי כמו שהוא (זה גם המצב
 * הנכון עבור Pexels — כבר hosted, לא צריך להעלות מחדש). ⚠️ לא מאומת מול S3/Cloudinary
 * אמיתי — אין credentials לבדוק; כשתוסיפו אותם, זה המקום הראשון להשלים את ההעלאה בפועל.
 */
export async function persistMediaUrl(sourceUrl, env = process.env) {
  if (!sourceUrl) return null;

  if (!env.AWS_S3_BUCKET && !env.CLOUDINARY_URL) {
    return sourceUrl;
  }

  console.warn(
    '[cloudStorage] AWS_S3_BUCKET/CLOUDINARY_URL is set but re-upload is not implemented yet — ' +
      'passing the source URL through unchanged. Implement the actual upload here once you confirm which provider.'
  );
  return sourceUrl;
}
