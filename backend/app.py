from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import base64
import easyocr
import os
import threading

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*", "supports_credentials": True}})

# Global variable to cache the OCR pipeline between invocations
ocr_reader = None
ocr_loading = False
ocr_loaded = False

def initialize_ocr():
    global ocr_reader, ocr_loading, ocr_loaded
    if not ocr_loading and not ocr_loaded:
        ocr_loading = True
        ocr_reader = easyocr.Reader(['en'])  # Load English OCR model
        ocr_loaded = True
        ocr_loading = False

def get_ocr_reader():
    global ocr_reader, ocr_loading, ocr_loaded
    if not ocr_loaded:
        if not ocr_loading:
            threading.Thread(target=initialize_ocr).start()
        return None
    return ocr_reader

def calculate_vector(start_point, end_point):
    return (end_point[0] - start_point[0], end_point[1] - start_point[1])

def detect_shapes_with_ocr_image(image):
    """
    Process the given image (a NumPy array) to detect rectangular shapes and perform OCR on them.
    Returns a list of dictionaries containing image info and details of each detected shape.
    """
    # Load (or reuse) the OCR pipeline
    reader = get_ocr_reader()
    if reader is None:
        return [{"error": "OCR model is still loading, please try again in a moment"}]
    
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
    contours, hierarchy = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
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
        text_results = reader.readtext(roi)
        # Extract the most confident OCR result
        if text_results:
            text, confidence = text_results[0][1], text_results[0][2]
        else:
            text, confidence = "", 0.0
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
    
@app.route('/api/preload', methods=['GET'])
def preload():
    """Preload the OCR model in the background"""
    global ocr_loaded, ocr_loading
    
    if ocr_loaded:
        return jsonify({"status": "ready", "message": "OCR model already loaded"})
    
    if ocr_loading:
        return jsonify({"status": "loading", "message": "OCR model is currently loading"})
    
    # Start loading in a background thread
    threading.Thread(target=initialize_ocr).start()
    return jsonify({"status": "started", "message": "Started loading OCR model"})

@app.route('/api/status', methods=['GET'])
def status():
    """Check the status of OCR model loading"""
    global ocr_loaded, ocr_loading
    
    if ocr_loaded:
        return jsonify({"status": "ready", "message": "OCR model is loaded and ready"})
    
    if ocr_loading:
        return jsonify({"status": "loading", "message": "OCR model is still loading"})
    
    return jsonify({"status": "uninitialized", "message": "OCR model loading has not started"})

@app.route('/api/detect', methods=['POST'])
def detect():
    try:
        if not request.json or 'image' not in request.json:
            return jsonify({"error": "No image provided."}), 400
        
        # Check if OCR model is loaded
        global ocr_loaded, ocr_loading
        if not ocr_loaded:
            if not ocr_loading:
                # Start loading if not already loading
                threading.Thread(target=initialize_ocr).start()
                return jsonify({"status": "loading", "message": "OCR model loading has started, please try again in a moment"}), 202
            else:
                return jsonify({"status": "loading", "message": "OCR model is still loading, please try again in a moment"}), 202
                
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
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port)
