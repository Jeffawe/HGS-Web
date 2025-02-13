import cv2
import numpy as np
import base64
import json
import keras_ocr
from http.server import BaseHTTPRequestHandler
from io import BytesIO

# Global variable to cache the OCR pipeline between invocations
pipeline = None

def get_pipeline():
    global pipeline
    if pipeline is None:
        # This may take a while on the first request.
        pipeline = keras_ocr.pipeline.Pipeline()
    return pipeline

def calculate_vector(start_point, end_point):
    return (end_point[0] - start_point[0], end_point[1] - start_point[1])

def detect_shapes_with_ocr_image(image):
    """
    Process the given image (a NumPy array) to detect rectangular shapes and perform OCR on them.
    Returns a list of dictionaries containing image info and details of each detected shape.
    """
    # Load (or reuse) the OCR pipeline
    pipeline = get_pipeline()

    # Get image dimensions
    height, width, channels = image.shape

    # Prepare initial image info
    image_info = {
        "name": "Original",
        "text": "Original",
        "position": {"x": 0, "y": 0},
        "width": width,
        "height": height
    }
    results = [image_info]

    # Pre-process the image for shape detection
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150)

    # Find contours in the edged image
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    shape_count = 0

    for contour in contours:
        # Approximate contour to a polygon
        epsilon = 0.04 * cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, epsilon, True)
        num_vertices = len(approx)

        # Process only 4‑vertex shapes (rectangles/squares)
        if num_vertices != 4:
            continue

        # Get the bounding rectangle and determine shape name
        x, y, w, h = cv2.boundingRect(approx)
        aspect_ratio = float(w) / h
        if 0.95 <= aspect_ratio <= 1.05:
            shape_name = f"Square{shape_count}"
        else:
            shape_name = f"Rectangle{shape_count}"

        # Crop region of interest for OCR
        roi = image[y:y + h, x:x + w]

        # Run OCR on the ROI
        predictions = pipeline.recognize([roi])
        if predictions and predictions[0]:
            text = predictions[0][0][0]
            confidence = predictions[0][0][1]
        else:
            text = ""
            confidence = 0.0

        # Calculate a vector (for example, from (0,0) to the first vertex)
        vector = calculate_vector((0, 0), approx[0][0])
        shape_info = {
            "name": shape_name,
            "text": text,
            "position": {"x": int(vector[0]), "y": int(vector[1])},
            "width": w,
            "height": h,
            "direction": 0,
            "confidence": confidence
        }
        results.append(shape_info)
        shape_count += 1

    return results

# def handler(request, response):
#     """
#     Vercel serverless function entry point.
#     Expects a POST request with JSON body:
#       { "image": "<base64-encoded-image-data>" }
#     Returns JSON with OCR and shape detection results.
#     """
#     try:
#         print("Gotten Request")
#         # Get the JSON payload
#         data = request.get_json()
#         if data is None or "image" not in data:
#             response.status_code = 400
#             return json.dumps({"error": "No image provided."})

#         # Decode the base64 image data
#         image_data = data["image"]
#         image_bytes = base64.b64decode(image_data)
#         nparr = np.frombuffer(image_bytes, np.uint8)
#         image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
#         if image is None:
#             response.status_code = 400
#             return json.dumps({"error": "Invalid image data."})

#         # Process the image
#         results = detect_shapes_with_ocr_image(image)

#         response.status_code = 200
#         response.set_header("Content-Type", "application/json")
#         return json.dumps(results)

#     except Exception as e:
#         response.status_code = 500
#         return json.dumps({"error": str(e)})
    
class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        """
        Handle POST requests from Vercel.
        Expects a JSON body with:
          { "image": "<base64-encoded-image-data>" }
        Returns JSON with OCR and shape detection results.
        """
        try:
            print("Gotten Request")

            # Get the content length to read the request body
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "No image provided."}).encode())
                return

            # Read and parse the JSON payload
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))
            if "image" not in data:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "No image provided."}).encode())
                return

            # Decode the base64 image data
            image_data = data["image"]
            image_bytes = base64.b64decode(image_data)
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if image is None:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Invalid image data."}).encode())
                return

            # Process the image
            results = detect_shapes_with_ocr_image(image)

            # Send the response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(results).encode())

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
            return
