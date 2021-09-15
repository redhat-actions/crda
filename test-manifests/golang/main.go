package main

import (
	"fmt"

	_ "aahframe.work"

	_ "github.com/slackhq/nebula/cert"

	_ "github.com/slackhq/nebula"

	_ "code.cloudfoundry.org/archiver/extractor"

	_ "github.com/googleapis/gax-go"

	_ "github.com/googleapis/gax-go/v2"
)

func main() {
	fmt.Println("vim-go")
}
