# Bingflix: Movie Recommendation Platform with ML Integration

<div align="center">

*A State-of-the-Art movie browsing platform with a personalized ML-powered recommendations*

[![Made with Node.js](https://img.shields.io/badge/Made%20with-Node.js-339933?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![Powered by ML](https://img.shields.io/badge/Powered%20by-Machine%20Learning-FF6F00?style=for-the-badge&logo=tensorflow)](https://scikit-learn.org)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?style=for-the-badge&logo=vercel)](https://vercel.com)
[![ML on GCP](https://img.shields.io/badge/ML%20on-Google%20Cloud-4285F4?style=for-the-badge&logo=google-cloud)](https://cloud.google.com/run)

</div>

## Original Source
> 📝 **Note**  
> This project was originally created & designed by my incredibly talented friend, [**Abhilash Sarangi**](https://github.com/dev1abhi).  
> I was fortunate to contribute a small part to this amazing initiative, and I’m truly grateful for the opportunity.  
> All major credits go to him for bringing this brilliant concept to life.  
>
> ✨ **Check out the original project here**: ([BingeFlix](https://github.com/dev1abhi/Bingflix-Website))  
>
> **P.S.** If you love this project, don’t forget to ⭐ the repository—it motivates my friend to keep building and innovating! 🙌

---

## 🤝 My Contributions

While the core idea and design belong to my friend, I had the privilege of collaborating and adding some technical enhancements:

- 🔐 **Authentication System** – Implemented a secure user sign-up and login flow.  
- ☁️ **Cloud Integration** – Utilized GCP for Cloud Run (Serverless) and Cloud Registry (Docker Container).  
- 🧠 **Machine Learning Recommender System** – Built and integrated a personalized movie recommendation engine.  
- 💾 **Database Management** – Used MongoDB Atlas to structure and manage user data & movie preferences in the cloud.  
- 🛰️ **Node Application** – Developed backend logic for fetching/storing data in DB, deployed on Vercel (Serverless).  

A heartfelt thank you to my friend for letting me be part of this journey. It was an absolute pleasure contributing to such a cool and cinematic project!


## 🎬 Project Overview

Bingflix transforms the movie browsing experience by combining a sleek interface with intelligent recommendations. The platform allows users to discover content from TMDB, enjoy videos via embedded players, maintain personalized profiles, and receive ML-based recommendations tailored to their preferences.

### ✨ Key Features

- **🔐 User Authentication**: Secure JWT-based login and registration system
- **🎥 Content Discovery**: Browse an extensive catalog of movies and TV series
- **📺 Video Integration**: Watch content through Vidsrc and SmashyStream
- **🧠 Smart Recommendations**: ML-based personalized content recommendations
- **❤️ User Preferences**: Like and save favorite movies and series
- **📱 Responsive Design**: Seamless experience across all devices

## 🏗️ Technology Stack

### 🎭 Frontend
- **HTML5/CSS3/JavaScript**: Creating a responsive, intuitive user interface
- **Dynamic DOM Manipulation**: Real-time content updates without page reloads
- **JWT Authentication**: Secure token storage in localStorage
- **Fetch API**: Asynchronous communication with backend services

### ⚙️ Backend API (Node.js/Express)
- **RESTful Architecture**: Well-structured endpoints for all user interactions
- **Express.js Framework**: Efficient request handling and middleware integration
- **JWT Authentication**: Secure user identity verification
- **Mongoose ODM**: Elegant MongoDB object modeling
- **TMDB API Integration**: Real-time movie and series data

### 🧠 Machine Learning Service (Python/Flask)
- **Content-Based Filtering**: Recommendation system analyzing movie attributes
- **TF-IDF Vectorization**: Converting text features into numerical vectors
- **Cosine Similarity Algorithm**: Computing content similarity scores
- **Flask API**: Lightweight Python web framework for ML service
- **Pandas/NumPy**: Data manipulation and numerical operations

### 🗃️ Database
- **MongoDB Atlas**: Cloud-hosted NoSQL database service
- **Document-Based Schema**: Flexible data modeling for user profiles and preferences
- **Indexed Collections**: Optimized query performance

### ☁️ Cloud Infrastructure
- **Vercel**: Hosting frontend assets and Node.js serverless functions
- **Google Cloud Run**: Container orchestration for ML service
- **Google Artifact Registry**: Storage for Docker container images
- **MongoDB Atlas**: Cloud database service

## 🔄 System Workflow

The platform operates on a sophisticated workflow that spans multiple services:

1. **User Registration & Authentication:**
   - User submits credentials via frontend form
   - Backend validates input, hashes passwords with bcrypt
   - JWT token generated and returned to browser
   - Frontend stores token in localStorage for session persistence

2. **Content Discovery & Interaction:**
   - Frontend fetches movie/series data from TMDB via backend proxy
   - User browses content with dynamic filtering options
   - Content details page displays comprehensive information and streaming options
   - User can "like" content, triggering background recommendation processes

3. **Recommendation Pipeline:** 
   - User likes content (movie/series)
   - Frontend sends authenticated like request to Node.js API
   - Backend stores preference in MongoDB and triggers ML service (asynchronously)
   - ML service awakens (Cold Start in Cloud Run if inactive)
   - ML service retrieves user's liked content history
   - Service fetches full content details from TMDB API
   - Text features extracted and processed with TF-IDF
   - Cosine similarity calculated between liked content and candidate pool
   - Top N recommendations identified and saved to user's MongoDB document
   - Process completes independently of user's current session

4. **Recommendation Display:**
   - User navigates to recommendations page
   - Backend fetches pre-calculated recommendation IDs from MongoDB
   - Backend enriches IDs with full content details from TMDB
   - Frontend renders personalized content cards
   - User discovers new content aligned with their taste profile

## 🚀 ML Recommendation System In Depth

### Content-Based Filtering Approach

The recommendation engine employs sophisticated content-based filtering techniques to analyze movie attributes and identify similarities:

### Feature Engineering

The system analyzes multiple content attributes:

- **Title**: Captures naming patterns and themes
- **Overview**: Identifies plot elements and storylines
- **Genres**: Categorizes content by type
- **Keywords**: Captures specific themes and elements

### Performance Optimization

- **Pre-calculation Strategy**: Recommendations computed asynchronously and stored
- **Batch Processing**: Updates triggered after preference changes, not real-time
- **Incremental Updates**: Algorithm designed to incorporate new likes efficiently

## ☁️ Google Cloud Platform Integration Deep Dive

### Why Google Cloud Run?

After encountering Vercel's serverless function limitations (250MB package size limit), I selected Google Cloud Run for the ML service based on:

- **Container-Native Architecture**: Freedom to use any dependencies without size constraints
- **Automatic Scaling**: Scales to zero when inactive for cost efficiency
- **On-Demand Processing**: Awakens only when needed for recommendation generation
- **Flexible Resource Allocation**: Configurable CPU and memory allocation for ML workloads
- **Integrated Logging**: Comprehensive monitoring and debugging capabilities

### GCP Implementation Details

1. **Project Setup**:
   - Created dedicated GCP project
   - Enabled Cloud Run, Artifact Registry, and Cloud Build APIs
   - Configured billing and permissions

2. **Containerization**:
   - Developed a multi-stage Dockerfile optimizing for size and security
   - Used Python 3.12 slim base image
   - Implemented proper dependency management
   - Configured Gunicorn as the WSGI server

3. **Cloud Build Pipeline**:
   - Automated container build process
   - Integrated vulnerability scanning
   - Pushed image to Artifact Registry

4. **Cloud Run Configuration**:
   - Deployed with memory optimization (2GB)
   - Configured concurrency settings for ML workloads
   - Implemented environment variable management for secrets
   - Set appropriate timeout parameters (60s)

5. **Environment Variable Management**:
   - Securely stored MongoDB connection string
   - Managed TMDB API key access
   - Configured service-to-service authentication

## 🔍 Technical Challenges & Engineering Solutions

### 1. Serverless Function Size Limitations

**Challenge**: The ML service with scikit-learn and pandas exceeded Vercel's 250MB package size limit.

**Solution**: Containerized the Python application and deployed it on Google Cloud Run, which supports unlimited dependency sizes. This required:
- Creating a multi-stage Dockerfile to optimize image size
- Setting up Google Artifact Registry for container storage
- Configuring Cloud Run for efficient resource allocation
- Implementing proper cold start handling

### 2. Asynchronous Processing Coordination

**Challenge**: Vercel serverless functions timed out (~10s limit) while waiting for ML processing (~19s with cold starts).

**Solution**: Implemented an advanced **fire-and-forget pattern**:
- Backend sends non-blocking HTTP request to ML service
- Request includes authentication token and user ID
- ML service processes independently of API response cycle
- Recommendations stored in database for future retrieval
- Added comprehensive logging for asynchronous debugging

### 3. Cross-Service Authentication & Security

**Challenge**: Securing communication between Node.js API and Python ML service across different cloud providers.

**Solution**: 
- Implemented JWT-based service-to-service authentication
- Added request validation checking origin and timestamp
- Stored shared secrets in environment variables
- Applied rate limiting to prevent abuse
- Implemented IP allowlisting for additional security

### 4. Data Consistency Across Services

**Challenge**: Maintaining consistent user preference data across browser storage, Node.js API, and ML service.

**Solution**:
- Migrated from browser localStorage to MongoDB for preference storage
- Implemented MongoDB change streams for real-time updates
- Added transaction support for critical operations
- Created robust error handling with retry mechanisms
- Designed data validation at multiple layers

### 5. Cold Start Latency Management

**Challenge**: Google Cloud Run's cold starts introduced significant latency for recommendation generation.

**Solution**:
- Implemented separate endpoints for synchronous vs. asynchronous operations
- Created a clever "pre-warming" strategy during predictable high-traffic periods
- Optimized container startup time by minimizing dependencies
- Added caching layer for frequently accessed TMDB data
- Implemented progressive loading UI patterns to handle latency gracefully

### 6. MongoDB Connection Management

**Challenge**: Managing database connections efficiently across serverless function invocations.

**Solution**:
- Implemented connection pooling with automatic retry logic
- Created efficient indexes for recommendation and user queries
- Utilized MongoDB aggregation pipeline for complex operations
- Designed database schema for optimal query performance
- Implemented proper connection cleanup to prevent leaks

## 🛠️ Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript
- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas
- **Authentication**: JSON Web Tokens (JWT)
- **ML/Data Science**: Python, scikit-learn, TF-IDF, Cosine Similarity
- **API Integration**: TMDB API, RESTful architecture
- **Cloud Services**: Vercel, Google Cloud Run, Google Artifact Registry
- **DevOps**: Docker, Git, CI/CD
- **Security**: bcrypt password hashing, environment variables

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.