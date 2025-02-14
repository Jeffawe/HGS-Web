from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import base64
import keras_ocr
import os
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
import tensorflow as tf


app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*", "allow_headers": "*", "methods": "*"}})


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
    
@app.route('/api/detect', methods=['POST'])
def detect():
    try:
        if not request.json or 'image' not in request.json:
            return jsonify({"error": "No image provided."}), 400

        # Decode the base64 image data
        image_data = request.json["image"]
        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            return jsonify({"error": "Invalid image data."}), 400

        # Process the image
        results = detect_shapes_with_ocr_image(image)
        return jsonify(results)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=10000)