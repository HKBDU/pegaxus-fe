#!/usr/bin/env python3
"""
Pegaxus Driver GPS Simulator Script (Standalone Python)
======================================================
Mô phỏng tài xế gửi tọa độ GPS định kỳ 2.5s/lần theo API GP2 của Pegaxus Backend.

Yêu cầu:
  pip install requests

Cách dùng:
  python scripts/gps_simulator.py --base https://your-backend --transport <ID> --token <JWT>
"""

import argparse
import json
import math
import os
import random
import sys
import time
from datetime import datetime, timezone

try:
    import requests
except ImportError:
    print("Vui lòng cài đặt requests: pip install requests")
    sys.exit(1)

def hav(a, b):
    R = 6371000
    p1, p2 = math.radians(a[1]), math.radians(b[1])
    dp, dl = p2 - p1, math.radians(b[0] - a[0])
    h = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2 * R * math.asin(math.sqrt(min(1.0, h)))

def bearing(a, b):
    p1, p2 = math.radians(a[1]), math.radians(b[1])
    dl = math.radians(b[0] - a[0])
    y = math.sin(dl) * math.cos(p2)
    x = math.cos(p1)*math.sin(p2) - math.sin(p1)*math.cos(p2)*math.cos(dl)
    return (math.degrees(math.atan2(y, x)) + 360) % 360

def load_route(path):
    with open(path, "r", encoding="utf-8") as f:
        g = json.load(f)
    if isinstance(g, dict) and g.get("type") == "FeatureCollection":
        g = g["features"][0]
    if isinstance(g, dict) and g.get("type") == "Feature":
        g = g["geometry"]
    if isinstance(g, dict) and g.get("type") == "LineString":
        return g["coordinates"]
    if isinstance(g, list):
        return g
    raise ValueError("File GeoJSON không hợp lệ (cần LineString hoặc FeatureCollection).")

def jitter(lon, lat, noise_m=3):
    if noise_m <= 0:
        return lon, lat
    ang = random.uniform(0, 2 * math.pi)
    d = random.gauss(0, noise_m)
    d_lat = (d * math.cos(ang)) / 110540
    d_lon = (d * math.sin(ang)) / (111320 * math.cos(math.radians(lat)))
    return round(lon + d_lon, 4), round(lat + d_lat, 4)

def build_body(lat, lon, speed_kmh, heading, accuracy):
    # Khớp 100% driverLocationRequestSchema của Pegaxus Backend
    return {
        "latitude": round(lat, 4),
        "longitude": round(lon, 4),
        "recordedAt": datetime.now(timezone.utc).isoformat(),
        "speedKmh": round(max(0.0, speed_kmh), 1),
        "headingDegrees": round(heading % 360, 1),
        "accuracyMeters": round(accuracy, 1),
    }

def main():
    parser = argparse.ArgumentParser(description="Pegaxus Driver GPS Simulator")
    parser.add_argument("--base", default=os.getenv("PEGAXUS_BASE_URL", "http://localhost:5000"), help="Backend URL")
    parser.add_argument("--transport", required=True, help="Transport ID (e.g. 123 hoặc GUID)")
    parser.add_argument("--token", required=True, help="Driver JWT Token")
    parser.add_argument("--route", default=os.path.join(os.path.dirname(__file__), "sample_route.geojson"), help="Path to GeoJSON route")
    parser.add_argument("--speed", type=float, default=60.0, help="Vehicle speed in km/h (default: 60)")
    parser.add_argument("--interval", type=float, default=2.5, help="Send interval in seconds (default: 2.5)")
    parser.add_argument("--loop", action="store_true", help="Loop the route continuously")
    parser.add_argument("--signal-loss", nargs=2, type=int, metavar=("START_SEC", "DURATION_SEC"), help="Simulate signal loss (e.g. --signal-loss 60 120)")
    args = parser.parse_args()

    coords = load_route(args.route)
    cum = [0.0]
    for i in range(1, len(coords)):
        cum.append(cum[-1] + hav(coords[i-1], coords[i]))
    total_dist = cum[-1]

    def at(dist):
        if dist <= 0:
            hd = bearing(coords[0], coords[1]) if len(coords) > 1 else 0
            return coords[0][0], coords[0][1], hd
        if dist >= total_dist:
            hd = bearing(coords[-2], coords[-1]) if len(coords) > 1 else 0
            return coords[-1][0], coords[-1][1], hd
        for i in range(1, len(cum)):
            if dist <= cum[i]:
                seg = cum[i] - cum[i-1]
                t = (dist - cum[i-1]) / seg if seg > 0 else 0
                a, b = coords[i-1], coords[i]
                return a[0] + (b[0]-a[0])*t, a[1] + (b[1]-a[1])*t, bearing(a, b)
        return coords[-1][0], coords[-1][1], 0

    url = f"{args.base.rstrip('/')}/api/v1/transports/{args.transport}/locations"
    headers = {
        "Authorization": f"Bearer {args.token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    print("=" * 60)
    print("🚀 PEGAXUS DRIVER GPS SIMULATOR")
    print(f"• URL: {url}")
    print(f"• Route points: {len(coords)} | Total distance: {total_dist/1000:.2f} km")
    print(f"• Speed: {args.speed} km/h | Interval: {args.interval}s")
    if args.signal_loss:
        print(f"• Signal loss at {args.signal_loss[0]}s for {args.signal_loss[1]}s")
    print("=" * 60)

    dist = 0.0
    start_time = time.time()

    while True:
        tick = time.time()
        elapsed = tick - start_time
        lon, lat, hd = at(dist)
        lon, lat = jitter(lon, lat, noise_m=3)
        speed = max(0.0, random.gauss(args.speed, 3.0))

        # Check signal loss
        in_loss = False
        if args.signal_loss:
            s_start, s_dur = args.signal_loss
            if s_start <= elapsed < s_start + s_dur:
                in_loss = True

        if in_loss:
            print(f"[{elapsed:6.1f}s] 📶 MẤT SÓNG (bỏ mẫu GPS, không gửi bù)")
        else:
            body = build_body(lat, lon, speed, hd, random.uniform(5.0, 12.0))
            try:
                r = requests.post(url, json=body, headers=headers, timeout=10)
                data = r.json() if r.content else {}
                status_color = "🟢" if r.status_code == 200 else "🔴"
                print(f"[{elapsed:6.1f}s] {status_color} {r.status_code} | Lat: {lat:.4f}, Lon: {lon:.4f}, Speed: {speed:.1f} km/h, Heading: {hd:.1f}° -> {data}")

                if r.status_code in (401, 403):
                    print("❌ Token hết hạn hoặc sai quyền tài xế. Dừng simulator."); break
                if data.get("accepted") is False:
                    print("⚠️ Server từ chối:", data.get("reason")); break
                if data.get("arrival"):
                    print("🎯 ĐÃ ĐẾN BÁN KÍNH TRẠM DỪNG (GEOFENCING TRIGGERED):", data["arrival"])
            except Exception as e:
                print(f"[{elapsed:6.1f}s] ⚠️ Lỗi kết nối HTTP:", e)

        dist += (args.speed / 3.6) * args.interval
        if dist > total_dist:
            if not args.loop:
                print(f"🏁 Đã hoàn thành toàn bộ tuyến đường ({total_dist/1000:.2f} km). Kết thúc.")
                break
            dist = 0.0
            print("🔄 Lặp lại tuyến đường...")

        sleep_time = max(0.0, args.interval - (time.time() - tick))
        time.sleep(sleep_time)

if __name__ == "__main__":
    main()
