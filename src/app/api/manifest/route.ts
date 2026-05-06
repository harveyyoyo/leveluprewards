import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const schoolId = searchParams.get('schoolId');

  // If no schoolId or invalid, fallback to root start_url
  const startUrl = schoolId ? `/${schoolId}/portal` : '/';
  const scope = schoolId ? `/${schoolId}` : '/';
  const id = schoolId ? `/${schoolId}` : '/';

  const manifest = {
    "name": "Student Reward System",
    "short_name": "Student Rewards",
    "description": "A school points and rewards system.",
    "id": id,
    "start_url": startUrl,
    "scope": scope,
    "display": "fullscreen",
    "display_override": [
      "fullscreen",
      "window-controls-overlay",
      "standalone"
    ],
    "background_color": "#ffffff",
    "theme_color": "#13a58d",
    "icons": [
      {
        "src": "/logo.png",
        "sizes": "192x192",
        "type": "image/png"
      },
      {
        "src": "/logo.png",
        "sizes": "512x512",
        "type": "image/png"
      }
    ],
    "screenshots": [
      {
        "src": "/screenshot-wide.png",
        "sizes": "1280x720",
        "type": "image/png",
        "form_factor": "wide"
      },
      {
        "src": "/screenshot-mobile.png",
        "sizes": "720x1280",
        "type": "image/png",
        "form_factor": "narrow"
      }
    ]
  };

  return NextResponse.json(manifest);
}
