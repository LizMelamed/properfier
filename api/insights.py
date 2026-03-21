from http.server import BaseHTTPRequestHandler
import json
import os
import urllib.request
import urllib.error


def build_prompt(payload):
    area = payload.get("area", "Unknown area")
    avg_price = payload.get("avg_price", "unknown")
    avg_revenue = payload.get("avg_revenue", "unknown")
    predicted_roi = payload.get("predicted_roi", "unknown")
    radius_km = payload.get("radius_km", "unknown")
    budget = payload.get("budget", "unknown")

    return (
        "You are helping a property investor evaluate Airbnb opportunities in the UK. "
        "Write a concise, practical recommendation for the area below. "
        "Focus on the area's likely Airbnb potential, type of guest demand, strengths, "
        "risks, and a short hosting recommendation. "
        "Keep it to 4 short bullet points and 1 closing sentence. "
        "Do not mention that you are an AI.\n\n"
        f"Area: {area}\n"
        f"Budget cap: {budget}\n"
        f"Average price: {avg_price}\n"
        f"Average revenue: {avg_revenue}\n"
        f"Predicted ROI: {predicted_roi}\n"
        f"Nearby analysis radius: {radius_km} km\n"
    )


def extract_text(response_json):
    output = response_json.get("output", [])
    chunks = []
    for item in output:
        if item.get("type") != "message":
            continue
        for content in item.get("content", []):
            if content.get("type") == "output_text" and content.get("text"):
                chunks.append(content["text"])
    return "\n".join(chunks).strip()


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        try:
            api_key = os.environ["OPENAI_API_KEY"]
            model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

            content_length = int(self.headers.get("Content-Length", 0))
            raw_body = self.rfile.read(content_length).decode("utf-8") if content_length else "{}"
            payload = json.loads(raw_body or "{}")

            request_body = {
                "model": model,
                "input": build_prompt(payload),
            }

            req = urllib.request.Request(
                "https://api.openai.com/v1/responses",
                data=json.dumps(request_body).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                method="POST",
            )

            with urllib.request.urlopen(req, timeout=30) as response:
                response_json = json.loads(response.read().decode("utf-8"))

            text = extract_text(response_json)
            if not text:
                raise ValueError("OpenAI returned no text output")

            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"insights": text}).encode())

        except KeyError as exc:
            self.send_response(500)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(
                json.dumps({"error": f"Missing environment variable: {exc.args[0]}"}).encode()
            )
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8") if exc.fp else exc.reason
            self.send_response(exc.code)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"error": body}).encode())
        except Exception as exc:
            self.send_response(500)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(exc)}).encode())
