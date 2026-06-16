from flask import Flask, render_template, jsonify, request
import feedparser
import requests
import re
import datetime

app = Flask(__name__)

# Global cache for release notes
cached_notes = None
last_updated = None

def fetch_and_parse_notes():
    feed_url = 'https://docs.cloud.google.com/feeds/bigquery-release-notes.xml'
    try:
        response = requests.get(feed_url, timeout=10)
        response.raise_for_status()
        feed = feedparser.parse(response.content)
        
        parsed_items = []
        for entry in feed.entries:
            date_str = entry.get('title', 'Unknown Date')
            updated_str = entry.get('updated', '')
            entry_id = entry.get('id', '')
            
            # Content can be under 'content' or 'summary'
            content_val = ''
            if 'content' in entry:
                content_val = entry.content[0].value
            elif 'summary' in entry:
                content_val = entry.summary
            else:
                content_val = 'No content available.'
                
            # Split by <h3> tags to extract individual updates
            parts = re.split(r'<h3>(.*?)</h3>', content_val)
            
            if len(parts) > 1:
                for i in range(1, len(parts), 2):
                    category = parts[i].strip()
                    html_content = parts[i+1].strip() if i+1 < len(parts) else ''
                    
                    # Strip HTML tags to make a clean plaintext copy for tweets
                    clean_text = re.sub(r'<[^>]+>', '', html_content)
                    clean_text = ' '.join(clean_text.split())
                    
                    parsed_items.append({
                        'date': date_str,
                        'updated': updated_str,
                        'category': category,
                        'html': html_content,
                        'text': clean_text,
                        'id': f"{entry_id}#{category}-{i}",
                        'link': entry.get('link', '')
                    })
            else:
                # No <h3> sub-items, treat the entire entry as a single update
                clean_text = re.sub(r'<[^>]+>', '', content_val)
                clean_text = ' '.join(clean_text.split())
                parsed_items.append({
                    'date': date_str,
                    'updated': updated_str,
                    'category': 'General',
                    'html': content_val,
                    'text': clean_text,
                    'id': entry_id,
                    'link': entry.get('link', '')
                })
                
        return parsed_items, None
    except Exception as e:
        return [], str(e)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    global cached_notes, last_updated
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    if cached_notes is None or force_refresh:
        notes, error = fetch_and_parse_notes()
        if error:
            return jsonify({
                'status': 'error',
                'message': f"Failed to fetch release notes: {error}",
                'notes': []
            }), 500
        cached_notes = notes
        last_updated = datetime.datetime.now().strftime("%I:%M %p")
        
    return jsonify({
        'status': 'success',
        'notes': cached_notes,
        'last_updated': last_updated
    })

if __name__ == '__main__':
    # Flask runs on http://127.0.0.1:5000/ by default
    app.run(debug=True, port=5000)
