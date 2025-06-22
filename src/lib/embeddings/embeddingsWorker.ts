
import { pipeline, PipelineType } from "@huggingface/transformers";

class MyFeatureExtractionPipeline {
  static task: PipelineType = "feature-extraction";
  static model = "Snowflake/snowflake-arctic-embed-s";
  static instance = null;

  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      this.instance = pipeline(this.task, this.model, {
        quantized: false,
        progress_callback,
      });
    }

    return this.instance;
  }
}

// Define the query prefix required by the Snowflake model
const QUERY_PREFIX = "Represent this sentence for searching relevant passages: ";

// Listen for messages from the main thread
self.addEventListener("message", async (event) => {
  try {
    // Retrieve the pipeline. When called for the first time,
    // this will load the pipeline and save it for future use.
    const extractor = await MyFeatureExtractionPipeline.getInstance((x) => {
      // We also add a progress callback to the pipeline so that we can
      // track model loading.
      self.postMessage(x);
    });

    const { source, text, isQuery = false } = event.data;

    // Prepare the sentences for the model.
    // The query gets a prefix, but the documents do not.
    let processedText;
    if (isQuery) {
      processedText = QUERY_PREFIX + source;
    } else {
      processedText = Array.isArray(text) ? text : [text];
    }

    // Generate embeddings using the recommended pooling and normalization settings
    const embeddings = await extractor(processedText, {
      pooling: "cls",
      normalize: true,
    });

    // Send the output back to the main thread
    self.postMessage({
      status: "complete",
      embeddings: embeddings.tolist()
    });
  } catch (error) {
    self.postMessage({
      status: "error",
      error: error.message
    });
  }
});
