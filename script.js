// DOM Elements
const uploadCard = document.getElementById('upload-card');
const resultCard = document.getElementById('result-card');
const uploadPlaceholder = document.getElementById('upload-placeholder');
const previewImage = document.getElementById('preview-image');
const cameraFeed = document.getElementById('camera-feed');
const captureButton = document.getElementById('capture-button');
const uploadButton = document.getElementById('upload-button');
const cameraButton = document.getElementById('camera-button');
const recognizeButton = document.getElementById('recognize-button');
const errorMessage = document.getElementById('error-message');
const fileInput = document.getElementById('file-input');
const canvas = document.getElementById('canvas');
const loadingOverlay = document.getElementById('loading-overlay');
const backButton = document.getElementById('back-button');
const resultImage = document.getElementById('result-image');
const fruitName = document.getElementById('fruit-name');
const scientificName = document.getElementById('scientific-name');
const fruitDescription = document.getElementById('fruit-description');
const nutritionList = document.getElementById('nutrition-list');
const benefitsList = document.getElementById('benefits-list');
const factsList = document.getElementById('facts-list');

// Tab functionality
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Remove active class from all tabs and contents
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        // Add active class to clicked tab and corresponding content
        tab.classList.add('active');
        const tabName = tab.getAttribute('data-tab');
        document.getElementById(`${tabName}-content`).classList.add('active');
    });
});

// File Upload
uploadButton.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            previewImage.src = event.target.result;
            previewImage.classList.remove('hidden');
            uploadPlaceholder.classList.add('hidden');
            recognizeButton.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
});

// Camera Functionality
let stream = null;

cameraButton.addEventListener('click', async () => {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        
        cameraFeed.srcObject = stream;
        cameraFeed.classList.remove('hidden');
        uploadPlaceholder.classList.add('hidden');
        previewImage.classList.add('hidden');
        captureButton.classList.remove('hidden');
        
    } catch (err) {
        showError('Failed to access camera. Please check camera permissions.');
        console.error(err);
    }
});

captureButton.addEventListener('click', () => {
    // Set canvas dimensions to match video
    canvas.width = cameraFeed.videoWidth;
    canvas.height = cameraFeed.videoHeight;
    
    // Draw the current video frame to the canvas
    const ctx = canvas.getContext('2d');
    ctx.drawImage(cameraFeed, 0, 0, canvas.width, canvas.height);
    
    // Convert canvas to data URL
    const imageDataUrl = canvas.toDataURL('image/jpeg');
    
    // Display the captured image
    previewImage.src = imageDataUrl;
    previewImage.classList.remove('hidden');
    cameraFeed.classList.add('hidden');
    captureButton.classList.add('hidden');
    recognizeButton.classList.remove('hidden');
    
    // Stop the camera stream
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
});

// Recognize Fruit
recognizeButton.addEventListener('click', async () => {
    hideError();
    loadingOverlay.classList.remove('hidden');
    
    try {
        const imageDataUrl = previewImage.src;
        const result = await recognizeFruit(imageDataUrl);
        
        if (result) {
            displayResults(result, imageDataUrl);
        } else {
            showError('Could not identify a fruit in this image. Please try a clearer image of a fruit.');
        }
    } catch (err) {
        showError(`Recognition failed: ${err.message || 'Please try again'}`);
        console.error(err);
    } finally {
        loadingOverlay.classList.add('hidden');
    }
});

// Back Button
backButton.addEventListener('click', () => {
    resultCard.classList.add('hidden');
    uploadCard.classList.remove('hidden');
    
    // Reset the result card
    fruitName.textContent = 'Loading...';
    scientificName.textContent = '';
    fruitDescription.textContent = '';
    nutritionList.innerHTML = '<div class="loading-skeleton"></div><div class="loading-skeleton"></div><div class="loading-skeleton"></div>';
    benefitsList.innerHTML = '<div class="loading-skeleton"></div><div class="loading-skeleton"></div><div class="loading-skeleton"></div>';
    factsList.innerHTML = '<div class="loading-skeleton"></div><div class="loading-skeleton"></div><div class="loading-skeleton"></div>';
});

// Helper Functions
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}

function hideError() {
    errorMessage.classList.add('hidden');
}

// Fruit Recognition with Serverless Function
async function recognizeFruit(imageDataUrl) {
    try {
        // Extract base64 data from data URL
        const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');
        
        // Call the serverless function
        const response = await fetch('/.netlify/functions/recognize-fruit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ image: base64Data }),
        });
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.error || !result.fruitName) {
            throw new Error(result.error || 'No fruit detected');
        }
        
        // Get additional fruit data
        return {
            ...result,
            ...getFruitData(result.fruitName)
        };
    } catch (error) {
        console.error('Error recognizing fruit:', error);
        throw error;
    }
}

// Display Results
function displayResults(result, imageDataUrl) {
    // Set the result image
    resultImage.src = imageDataUrl;
    
    // Set the fruit information
    fruitName.textContent = result.fruitName;
    scientificName.textContent = result.scientificName || '';
    fruitDescription.textContent = result.description || '';
    
    // Set nutrition facts
    if (result.nutrition_facts) {
        let nutritionHtml = '';
        for (const [key, value] of Object.entries(result.nutrition_facts)) {
            if (key !== 'vitamins' && key !== 'minerals') {
                nutritionHtml += `
                    <div class="nutrition-item">
                        <span class="capitalize">${key.replace('_', ' ')}</span>
                        <span>${value}</span>
                    </div>
                `;
            }
        }
        
        // Add vitamins and minerals if available
        if (result.nutrition_facts.vitamins) {
            nutritionHtml += `
                <div class="nutrition-item">
                    <span>Vitamins</span>
                    <span>${Array.isArray(result.nutrition_facts.vitamins) ? result.nutrition_facts.vitamins.join(', ') : result.nutrition_facts.vitamins}</span>
                </div>
            `;
        }
        
        if (result.nutrition_facts.minerals) {
            nutritionHtml += `
                <div class="nutrition-item">
                    <span>Minerals</span>
                    <span>${Array.isArray(result.nutrition_facts.minerals) ? result.nutrition_facts.minerals.join(', ') : result.nutrition_facts.minerals  ? result.nutrition_facts.minerals.join(', ') : result.nutrition_facts.minerals}</span>
                </div>
            `;
        }
        
        nutritionList.innerHTML = nutritionHtml || '<p>No nutrition information available</p>';
    } else {
        nutritionList.innerHTML = '<p>No nutrition information available</p>';
    }
    
    // Set health benefits
    if (result.health_benefits && result.health_benefits.length > 0) {
        let benefitsHtml = '';
        result.health_benefits.forEach(benefit => {
            benefitsHtml += `<li>${benefit}</li>`;
        });
        benefitsList.innerHTML = benefitsHtml;
    } else {
        benefitsList.innerHTML = '<p>No health benefits information available</p>';
    }
    
    // Set fun facts
    if (result.fun_facts && result.fun_facts.length > 0) {
        let factsHtml = '';
        result.fun_facts.forEach(fact => {
            factsHtml += `<li>${fact}</li>`;
        });
        factsList.innerHTML = factsHtml;
    } else {
        factsList.innerHTML = '<p>No fun facts available</p>';
    }
    
    // Show the result card and hide the upload card
    uploadCard.classList.add('hidden');
    resultCard.classList.remove('hidden');
    
    // Scroll to top
    window.scrollTo(0, 0);
}

// Mock fruit data (fallback if API doesn't provide complete information)
function getFruitData(fruitName) {
    const fruitData = {
        'Apple': {
            nutrition_facts: {
                calories: '52 per 100g',
                carbs: '14g',
                fiber: '2.4g',
                protein: '0.3g',
                fat: '0.2g',
                vitamins: ['Vitamin C', 'Vitamin K'],
                minerals: ['Potassium']
            },
            health_benefits: [
                'May lower risk of heart disease',
                'Supports gut health with prebiotics',
                'Contains antioxidants that may help prevent certain cancers',
                'May help lower cholesterol levels'
            ],
            fun_facts: [
                'Apples float in water because 25% of their volume is air',
                'There are over 7,500 varieties of apples grown worldwide',
                'It takes about 36 apples to create one gallon of apple cider',
                'The science of apple growing is called pomology'
            ]
        },
        'Banana': {
            nutrition_facts: {
                calories: '89 per 100g',
                carbs: '23g',
                fiber: '2.6g',
                protein: '1.1g',
                fat: '0.3g',
                vitamins: ['Vitamin B6', 'Vitamin C'],
                minerals: ['Potassium', 'Magnesium']
            },
            health_benefits: [
                'Good source of potassium which supports heart health',
                'Contains vitamin B6 which helps brain development',
                'Provides energy and supports muscle function',
                'May help regulate blood sugar levels'
            ],
            fun_facts: [
                'Bananas are technically berries, while strawberries are not',
                'Bananas grow pointing upwards, not downwards',
                'A bunch of bananas is called a "hand" and a single banana is called a "finger"',
                'Wild bananas contain large, hard seeds and are not as sweet as cultivated varieties'
            ]
        },
        'Orange': {
            nutrition_facts: {
                calories: '47 per 100g',
                carbs: '12g',
                fiber: '2.4g',
                protein: '0.9g',
                fat: '0.1g',
                vitamins: ['Vitamin C', 'Vitamin A', 'Folate'],
                minerals: ['Potassium', 'Calcium']
            },
            health_benefits: [
                'Excellent source of vitamin C which boosts immunity',
                'Contains antioxidants that fight inflammation',
                'Supports skin health and collagen production',
                'May help lower blood pressure'
            ],
            fun_facts: [
                'The color orange was named after the fruit, not the other way around',
                'Brazil produces more oranges than any other country in the world',
                'There are over 600 varieties of oranges worldwide',
                'Orange trees can live and produce fruit for up to 100 years'
            ]
        }
    };
    
    // Default data for fruits not in our database
    const defaultData = {
        nutrition_facts: {
            calories: 'Varies',
            carbs: 'Varies',
            fiber: 'Varies',
            protein: 'Varies',
            fat: 'Varies',
            vitamins: ['Various vitamins'],
            minerals: ['Various minerals']
        },
        health_benefits: [
            'Fruits are generally rich in vitamins, minerals, and fiber',
            'Most fruits contain antioxidants that help fight free radicals',
            'Regular fruit consumption is associated with reduced risk of many diseases',
            'Fruits provide natural energy and support overall health'
        ],
        fun_facts: [
            'Fruits are the mature ovaries of flowering plants',
            'Humans have been cultivating fruits for thousands of years',
            'There are over 2,000 varieties of fruits grown throughout the world',
            'Fruits are an important part of a balanced diet'
        ]
    };
    
    // Try to match the fruit name (case insensitive)
    const normalizedName = fruitName.toLowerCase();
    for (const [key, value] of Object.entries(fruitData)) {
        if (key.toLowerCase() === normalizedName) {
            return value;
        }
    }
    
    return defaultData;
}
