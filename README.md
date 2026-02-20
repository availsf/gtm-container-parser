# GTM Container Difference Parser

A lightweight, secure, and purely client-side React application built to audit and compare Google Tag Manager (GTM) and GA4 configurations across multiple environments.

When managing complex analytics architectures, keeping Dev, Staging, and Production containers synchronized is a massive pain point. This tool solves that by allowing analytics engineers to upload up to three GTM JSON exports and instantly visualize the implementation gaps.

## ✨ Key Features

* **Multi-Environment Diffing:** Compare a baseline container (Slot 1) against two other environments (e.g., Staging and Prod) side-by-side.
* **Deep Equality Engine:** Powered by Lodash, the tool accurately flags tags and parameters as `MATCHED` (Green), `MISMATCHED` (Yellow), or `MISSING` (Red) using deep object comparison.
* **Smart Noise Reduction:** A "Show only differences" master toggle instantly collapses perfectly matched tags, reducing hundreds of rows down to just the broken parameters.
* **Intelligent Variable Inspector:** Click on any tag to view its underlying variables. Custom JavaScript is cleanly formatted via Prettier, and variable types are denoted by color-coordinated badges.
* **Stakeholder-Ready CSV Export:** Generate a filtered CSV diff report of your audit with a single click—perfect for handing off to development teams.
* **100% Client-Side Processing:** Built for privacy. GTM container JSON files are parsed entirely in the browser. No data is ever sent to a backend server.

## 🛠 Tech Stack

* **Framework:** Next.js (React)
* **Styling:** Tailwind CSS
* **Icons:** Lucide React
* **Diffing Logic:** Lodash (`_.isEqual`)
* **Code Formatting:** Prettier (Standalone)

## 🚀 How to Use

1. Export your GTM containers from the Google Tag Manager admin panel (Admin > Export Container).
2. Open the parser and upload your primary/baseline JSON file into **Slot 1**.
3. Upload your comparison containers into **Slot 2** and/or **Slot 3**.
4. The application will automatically flatten the GA4 tags and map their parameters.
5. Use the Search Bar to filter for specific tags (e.g., "purchase"), or toggle "Show only differences" to isolate implementation gaps.
6. Click **Export Diff to CSV** to download the results.

## 💻 Local Development

To run this project locally:

```bash
# Clone the repository
git clone 

# Navigate into the directory
cd gtm-container-parser

# Install dependencies
npm install

# Start the development server
npm run dev
Open http://localhost:3000 with your browser to see the result.

📄 License
This project is licensed under the MIT License - see the LICENSE file for details.